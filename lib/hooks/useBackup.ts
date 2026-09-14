'use client';

import { useEffect, useRef, useState } from 'react';

import type { BackupDownload, BackupProgress, RestorePreview } from '@/lib/backup/archive';
import type { BackupCommand, BackupEvent } from '@/lib/backup/protocol';
import { useDb } from '@/lib/context/DbContext';

export type BackupState =
  | { kind: 'closed' | 'choose' | 'cancelling' }
  | { kind: 'loading'; mode: 'export' | 'restore'; progress: BackupProgress | null }
  | { kind: 'download'; download: BackupDownload }
  | {
      kind: 'preview';
      preview: RestorePreview;
      download: BackupDownload | null;
      busy: 'backup' | 'restore' | null;
      progress: BackupProgress | null;
      message: string | null;
    }
  | { kind: 'error'; message: string };

export function useBackup(onRestored: () => void) {
  const database = useDb();
  const [state, setState] = useState<BackupState>({ kind: 'closed' });
  const workerRef = useRef<Worker | null>(null);
  const committing = useRef(false);
  const closing = useRef(false);
  const cancelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (cancelTimer.current) clearTimeout(cancelTimer.current);
      const worker = workerRef.current;
      if (!worker) return;
      worker.onmessage = null;
      worker.onerror = null;
      worker.postMessage({ type: 'cancel' } satisfies BackupCommand);
      if (!committing.current) setTimeout(() => worker.terminate(), 3000);
    },
    []
  );

  function start(command: { type: 'export' } | { type: 'prepare'; file: File }) {
    if (workerRef.current) return;
    if (!globalThis.Worker || !navigator.locks) {
      setState({
        kind: 'error',
        message:
          'Backup requires a browser with Web Workers and Web Locks. Update your browser and try again.',
      });
      return;
    }
    setState({
      kind: 'loading',
      mode: command.type === 'export' ? 'export' : 'restore',
      progress: null,
    });
    closing.current = false;
    const operationId = crypto.randomUUID();
    try {
      const worker = new Worker(new URL('../backup/backup.worker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<BackupEvent>) => {
        if (workerRef.current !== worker) return;
        const message = event.data;
        switch (message.type) {
          case 'progress':
            setState((previous) =>
              previous.kind === 'loading' || previous.kind === 'preview'
                ? { ...previous, progress: message.progress }
                : previous
            );
            break;
          case 'preview':
            if (!closing.current)
              setState({
                kind: 'preview',
                preview: message.preview,
                download: null,
                busy: null,
                progress: null,
                message: null,
              });
            break;
          case 'download':
            setState((previous) =>
              previous.kind === 'preview'
                ? { ...previous, download: message.download, busy: null, progress: null }
                : previous.kind === 'loading'
                  ? { kind: 'download', download: message.download }
                  : previous
            );
            break;
          case 'changed':
            committing.current = false;
            setState((previous) =>
              previous.kind === 'preview'
                ? {
                    ...previous,
                    preview: { ...previous.preview, current: message.current },
                    busy: null,
                    download: null,
                    message:
                      'The collection changed in another tab. Review the updated counts and confirm again.',
                  }
                : previous
            );
            break;
          case 'committed':
            committing.current = false;
            setState({ kind: 'closed' });
            onRestored();
            break;
          case 'error':
            committing.current = false;
            if (!closing.current)
              setState((previous) =>
                message.recoverable && previous.kind === 'preview'
                  ? { ...previous, busy: null, message: message.message }
                  : { kind: 'error', message: message.message }
              );
            break;
          case 'finished':
            if (cancelTimer.current) clearTimeout(cancelTimer.current);
            worker.terminate();
            workerRef.current = null;
            if (closing.current) {
              closing.current = false;
              setState({ kind: 'closed' });
            }
            break;
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        worker.terminate();
        workerRef.current = null;
        if (closing.current) {
          setState({ kind: 'closed' });
          return;
        }
        if (!committing.current) {
          setState({
            kind: 'error',
            message: 'Backup processing stopped. Reload the app and try again.',
          });
          return;
        }
        committing.current = false;
        void database
          .getCollectionState()
          .then((current) => {
            if (current.lastRestoreId === operationId) {
              setState({ kind: 'closed' });
              onRestored();
            } else
              setState({
                kind: 'error',
                message: 'Restoration did not complete. Your collection was not replaced.',
              });
          })
          .catch(() =>
            setState({
              kind: 'error',
              message: 'Unable to verify restoration. Reload the app to check your collection.',
            })
          );
      };
      worker.postMessage({ ...command, operationId } satisfies BackupCommand);
    } catch {
      workerRef.current?.terminate();
      workerRef.current = null;
      setState({
        kind: 'error',
        message: 'Unable to start backup processing. Reload the app and try again.',
      });
    }
  }

  function close() {
    if (committing.current || closing.current) return;
    const worker = workerRef.current;
    if (!worker) {
      setState({ kind: 'closed' });
      return;
    }
    closing.current = true;
    setState({ kind: 'cancelling' });
    worker.postMessage({ type: 'cancel' } satisfies BackupCommand);
    cancelTimer.current = setTimeout(() => {
      if (workerRef.current !== worker) return;
      worker.terminate();
      workerRef.current = null;
      closing.current = false;
      setState({ kind: 'closed' });
    }, 3000);
  }

  function exportCurrent() {
    if (state.kind !== 'preview' || state.busy) return;
    setState({ ...state, busy: 'backup', message: null });
    workerRef.current?.postMessage({ type: 'export-current' } satisfies BackupCommand);
  }

  function restore() {
    if (state.kind !== 'preview' || state.busy || !workerRef.current) return;
    committing.current = true;
    setState({ ...state, busy: 'restore', message: null });
    workerRef.current.postMessage({
      type: 'commit',
      revision: state.preview.current.revision,
    } satisfies BackupCommand);
  }

  return {
    state,
    close,
    restore,
    exportCurrent,
    exportBackup: () => start({ type: 'export' }),
    chooseFile: () => setState({ kind: 'choose' }),
    prepare: (file: File) => start({ type: 'prepare', file }),
  };
}
