import {
  BlobReader,
  type FileEntry,
  TextReader,
  Uint8ArrayReader,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js/index-native.js';

import { type AppDatabase, CollectionChangedError, type CollectionState } from '@/lib/db';

import { BACKUP_LIMITS, type BackupManifest, parseManifest } from './format';
import { decodeStoredImage, validateImage } from './image';

export type BackupProgress = { phase: 'exporting' | 'checking'; completed: number; total: number };
export type BackupOptions = { signal: AbortSignal; onProgress: (progress: BackupProgress) => void };
export type BackupDownload = { blob: Blob; filename: string };
export type RestorePreview = {
  storageWarning: boolean;
  operationId: string;
  exportedAt: string;
  itemCount: number;
  imageCount: number;
  categories: Record<'book' | 'movie' | 'other', number>;
  samples: { id: number; name: string; category: string }[];
  current: CollectionState;
};

const exportChangedMessage =
  'The collection changed while preparing the backup. Close this window and choose Download backup again.';

class LimitedBlobReader extends BlobReader {
  override readUint8Array(index: number, length: number) {
    // In particular, do not allocate an unbounded ZIP central directory.
    if (length > BACKUP_LIMITS.entryBytes) throw new Error('ZIP directory exceeds the size limit.');
    return super.readUint8Array(index, length);
  }
}

function boundedOutput(limit: number, signal: AbortSignal, countBytes = (_size: number) => {}) {
  const parts: Blob[] = [];
  let size = 0;
  return {
    stream: new WritableStream<Uint8Array>({
      write(chunk) {
        signal.throwIfAborted();
        size += chunk.byteLength;
        if (size > limit) throw new Error('Backup data exceeds the allowed size limit.');
        countBytes(chunk.byteLength);
        parts.push(new Blob([chunk.slice().buffer]));
      },
    }),
    blob: (type: string) => new Blob(parts, { type }),
  };
}

function dataUrl(bytes: Uint8Array, type: string) {
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 0x8000)));
  }
  return `data:${type};base64,${btoa(parts.join(''))}`;
}

export async function discardRestore(database: AppDatabase, operationId: string) {
  await database.transaction('rw', [database.stagedItems, database.restoreSessions], async () => {
    await database.stagedItems.where('operationId').equals(operationId).delete();
    await database.restoreSessions.delete(operationId);
  });
}

export async function createBackup(
  database: AppDatabase,
  options: BackupOptions
): Promise<BackupDownload> {
  const { signal, onProgress } = options;
  signal.throwIfAborted();
  const { state, keys } = await database.transaction(
    'r',
    [database.items, database.metadata],
    async () => {
      const state = await database.getCollectionState();
      if (state.count > BACKUP_LIMITS.items) throw new Error('The backup limit is 10,000 items.');
      return { state, keys: await database.items.toCollection().primaryKeys() };
    }
  );
  const manifest: BackupManifest = {
    format: 'kirsh-vault-backup',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    items: [],
  };
  const encoder = new TextEncoder();
  let metadataBytes = encoder.encode(JSON.stringify(manifest)).length;
  let imageBytes = 0;
  const output = boundedOutput(BACKUP_LIMITS.archiveBytes, signal);
  // Images are already compressed. STORE avoids spending CPU to compress them again.
  const writer = new ZipWriter(output.stream, {
    useWebWorkers: false,
    level: 0,
    zip64: false,
    signal,
  });
  for (const key of keys) {
    signal.throwIfAborted();
    const item = await database.items.get(key);
    if (!item) throw new CollectionChangedError(exportChangedMessage);
    try {
      const { images, createdAt, ...fields } = item;
      // Concurrency versions belong to this installation, not the portable format.
      delete fields.revision;
      if (images !== undefined && (!Array.isArray(images) || images.length > 5))
        throw new Error('Invalid image list.');
      const paths: string[] = [];
      for (const [index, image] of (images ?? []).entries()) {
        signal.throwIfAborted();
        const { bytes, type } = decodeStoredImage(image);
        const info = await validateImage(bytes, type);
        imageBytes += bytes.byteLength;
        if (imageBytes + metadataBytes > BACKUP_LIMITS.archiveBytes) {
          throw new Error('The backup exceeds the 250 MB limit.');
        }
        const path = `images/${item.id}/${index}.${info.extension}`;
        await writer.add(path, new Uint8ArrayReader(bytes));
        paths.push(path);
      }
      const record = {
        ...fields,
        createdAt: createdAt.toISOString(),
        ...(images ? { images: paths } : {}),
      };
      const parsed = parseManifest({ ...manifest, items: [record] }).items[0];
      metadataBytes += encoder.encode(JSON.stringify(parsed)).length + 1;
      if (metadataBytes > BACKUP_LIMITS.entryBytes)
        throw new Error('Backup metadata exceeds 10 MB.');
      manifest.items.push(parsed);
    } catch (error) {
      signal.throwIfAborted();
      throw new Error(
        `Cannot back up item #${item.id} “${String(item.name).slice(0, 80)}”: ${
          error instanceof Error ? error.message : 'Invalid record.'
        }`
      );
    }
    onProgress({ phase: 'exporting', completed: manifest.items.length, total: keys.length });
  }
  signal.throwIfAborted();
  const json = JSON.stringify(manifest);
  if (encoder.encode(json).length + imageBytes > BACKUP_LIMITS.archiveBytes) {
    throw new Error('The backup exceeds the 250 MB limit.');
  }
  await writer.add('collection.json', new TextReader(json));
  await writer.close();
  signal.throwIfAborted();
  if ((await database.getCollectionState()).revision !== state.revision)
    throw new CollectionChangedError(exportChangedMessage);
  return {
    blob: output.blob('application/zip'),
    filename: `kirsh-vault-${manifest.exportedAt.replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')}.zip`,
  };
}

export async function prepareRestore(
  database: AppDatabase,
  file: Blob,
  operationId: string,
  options: BackupOptions
): Promise<RestorePreview> {
  const { signal, onProgress } = options;
  signal.throwIfAborted();
  if (file.size > BACKUP_LIMITS.archiveBytes) throw new Error('Choose a backup up to 250 MB.');
  const reader = new ZipReader(new LimitedBlobReader(file), {
    useWebWorkers: false,
    checkCrc32: true,
    checkOverlappingEntry: true,
    strictness: 'strict',
    signal,
  });
  try {
    const files = new Map<string, FileEntry>();
    let declaredBytes = 0;
    for await (const entry of reader.getEntriesGenerator()) {
      signal.throwIfAborted();
      if (
        entry.directory ||
        entry.encrypted ||
        files.has(entry.filename) ||
        !/^(collection\.json|images\/[1-9]\d*\/[0-4]\.(png|jpeg|webp))$/.test(entry.filename)
      ) {
        throw new Error('The backup contains unexpected, duplicate or encrypted files.');
      }
      if (![0, 8].includes(entry.compressionMethod))
        throw new Error('Unsupported ZIP compression.');
      declaredBytes += entry.uncompressedSize;
      if (
        entry.uncompressedSize > BACKUP_LIMITS.entryBytes ||
        declaredBytes > BACKUP_LIMITS.archiveBytes ||
        files.size >= BACKUP_LIMITS.entries
      ) {
        throw new Error('The backup exceeds the file count or size limit.');
      }
      files.set(entry.filename, entry);
    }
    let actualBytes = 0;
    async function readFile(path: string) {
      signal.throwIfAborted();
      const entry = files.get(path);
      if (!entry) throw new Error(`A required backup file is missing: ${path}`);
      const output = boundedOutput(BACKUP_LIMITS.entryBytes, signal, (size) => {
        actualBytes += size;
        if (actualBytes > BACKUP_LIMITS.archiveBytes)
          throw new Error('Unpacked backup exceeds 250 MB.');
      });
      await entry.getData(output.stream, { signal });
      return output.blob('application/octet-stream');
    }
    const metadata = await readFile('collection.json');
    const manifest = parseManifest(
      JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await metadata.arrayBuffer()))
    );
    const expected = new Set([
      'collection.json',
      ...manifest.items.flatMap((item) => item.images ?? []),
    ]);
    if (expected.size !== files.size || [...files.keys()].some((path) => !expected.has(path))) {
      throw new Error('The backup contains missing or unexpected image files.');
    }
    const categories = { book: 0, movie: 0, other: 0 };
    let completed = 0;
    let imageCount = 0;
    for (const record of manifest.items) {
      signal.throwIfAborted();
      const { images, createdAt, ...fields } = record;
      const restoredImages: string[] = [];
      for (const path of images ?? []) {
        const bytes = new Uint8Array(await (await readFile(path)).arrayBuffer());
        const type = `image/${path.slice(path.lastIndexOf('.') + 1)}`;
        await validateImage(bytes, type);
        restoredImages.push(dataUrl(bytes, type));
        imageCount++;
      }
      await database.stagedItems.add({
        operationId,
        id: record.id,
        item: {
          ...fields,
          createdAt: new Date(createdAt),
          ...(images ? { images: restoredImages } : {}),
        },
      });
      categories[record.category]++;
      onProgress({ phase: 'checking', completed: ++completed, total: manifest.items.length });
    }
    signal.throwIfAborted();
    await database.restoreSessions.add({ id: operationId, itemCount: manifest.items.length });
    const estimate = await navigator.storage?.estimate().catch(() => null);
    // Estimates are hints; browsers account for base64 storage differently.
    const storageWarning =
      !!estimate?.quota && estimate.quota - (estimate.usage ?? 0) < declaredBytes * (8 / 3);
    return {
      storageWarning,
      operationId,
      exportedAt: manifest.exportedAt,
      itemCount: manifest.items.length,
      imageCount,
      categories,
      current: await database.getCollectionState(),
      samples: [...manifest.items]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
        .slice(0, 3)
        .map(({ id, name, category }) => ({ id, name, category })),
    };
  } catch (error) {
    // Cleanup must not hide the original failure (e.g. browser storage becomes unavailable).
    await discardRestore(database, operationId).catch(() => {});
    throw error;
  } finally {
    await reader.close();
  }
}
