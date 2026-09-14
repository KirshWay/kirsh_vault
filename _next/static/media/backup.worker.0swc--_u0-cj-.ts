/// <reference lib="webworker" />

import { CollectionChangedError, db } from '@/lib/db';

import {
  type BackupProgress,
  createBackup,
  discardRestore,
  prepareRestore,
  type RestorePreview,
} from './archive';
import type { BackupCommand, BackupEvent } from './protocol';
import { BACKUP_LOCK, clearBackupStaging } from './session';

const worker = self as unknown as DedicatedWorkerGlobalScope;
const send = (event: BackupEvent) => worker.postMessage(event);
type Session = {
  id: string;
  controller: AbortController;
  preview: RestorePreview | null;
  phase: 'working' | 'preview' | 'download' | 'committing';
  finish: () => void;
};
let session: Session | null = null;

function errorMessage(error: unknown) {
  if (error instanceof Error && /CRC32|signature/i.test(error.message)) {
    return 'The backup is damaged or incomplete. Choose another copy.';
  }
  if (error instanceof Error && /quota/i.test(error.name)) {
    return 'Not enough browser storage. Free some space and try again. Your collection was not replaced.';
  }
  return error instanceof Error ? error.message : 'Backup processing failed. Please try again.';
}

function options(current: Session) {
  return {
    signal: current.controller.signal,
    onProgress: (progress: BackupProgress) => send({ type: 'progress', progress }),
  };
}

async function start(command: Extract<BackupCommand, { type: 'export' | 'prepare' }>) {
  if (session) return;
  const finished = Promise.withResolvers<void>();
  const current: Session = {
    id: command.operationId,
    controller: new AbortController(),
    preview: null,
    phase: 'working',
    finish: () => finished.resolve(),
  };
  session = current;
  try {
    await navigator.locks.request(BACKUP_LOCK, { ifAvailable: true }, async (lock) => {
      if (!lock)
        throw new Error('A backup operation is open in another tab. Close it and try again.');
      try {
        await clearBackupStaging(db);
        current.controller.signal.throwIfAborted();
        if (command.type === 'export') {
          const download = await createBackup(db, options(current));
          current.phase = 'download';
          send({ type: 'download', download });
        } else {
          current.preview = await prepareRestore(db, command.file, current.id, options(current));
          current.phase = 'preview';
          send({ type: 'preview', preview: current.preview });
        }
        await finished.promise;
      } finally {
        await discardRestore(db, current.id).catch(() => {});
      }
    });
  } catch (error) {
    if (!current.controller.signal.aborted) {
      send({ type: 'error', message: errorMessage(error), recoverable: false });
    }
  } finally {
    db.close();
    session = null;
    send({ type: 'finished' });
    worker.close();
  }
}

async function handle(command: BackupCommand) {
  if (command.type === 'export' || command.type === 'prepare') return start(command);
  const current = session;
  if (!current) return;
  if (command.type === 'cancel') {
    if (current.phase !== 'committing') {
      current.controller.abort();
      current.finish();
    }
    return;
  }
  if (current.phase !== 'preview' || !current.preview) return;
  try {
    if (command.type === 'export-current') {
      current.phase = 'working';
      const download = await createBackup(db, options(current));
      current.phase = 'preview';
      send({ type: 'download', download });
    } else {
      current.phase = 'committing';
      await db.replaceFromStaging(current.id, command.revision);
      send({ type: 'committed' });
      current.finish();
    }
  } catch (error) {
    current.phase = 'preview';
    if (current.controller.signal.aborted) return;
    if (error instanceof CollectionChangedError) {
      send({ type: 'changed', current: await db.getCollectionState() });
    } else send({ type: 'error', message: errorMessage(error), recoverable: true });
  }
}

worker.onmessage = (event: MessageEvent<BackupCommand>) => {
  void handle(event.data).catch((error) => {
    send({ type: 'error', message: errorMessage(error), recoverable: false });
    session?.finish();
  });
};
