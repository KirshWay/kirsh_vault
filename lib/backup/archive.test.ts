// @vitest-environment node
import 'fake-indexeddb/auto';

import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  Uint8ArrayReader,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js/index-native.js';
import Dexie from 'dexie';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { db } from '@/lib/db';

import { createBackup, prepareRestore } from './archive';
import fixture from './fixtures/v1.json';

const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQq4j6DwADmAHwUSyGuQAAAABJRU5ErkJggg==',
    'base64'
  )
);
const dataUrl = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
const options = () => ({ signal: new AbortController().signal, onProgress: () => {} });

async function archive(manifest: unknown = fixture, image = png, extra = false) {
  const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false, level: 0 });
  await writer.add('collection.json', new TextReader(JSON.stringify(manifest)));
  await writer.add('images/7/0.png', new Uint8ArrayReader(image));
  if (extra) await writer.add('surprise.txt', new TextReader('unexpected'));
  return writer.close();
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  // Node has no image decoder; browser tests exercise real PNG/JPEG/WebP decoding.
  vi.stubGlobal('createImageBitmap', async () => ({ width: 1, height: 1, close() {} }));
});
afterEach(() => {
  db.close();
  vi.unstubAllGlobals();
});

test('restores the published format fixture without changing the current collection during preview', async () => {
  const generation = (await db.getCollectionState()).generation;
  await db.addItem({ name: 'Existing', category: 'other' }, generation);
  const preview = await prepareRestore(db, await archive(), 'fixture', options());
  expect(preview).toMatchObject({
    itemCount: 2,
    imageCount: 1,
    categories: { book: 1, movie: 0, other: 1 },
    current: { count: 1 },
  });
  expect((await db.getAllItems())[0].name).toBe('Existing');
  await db.replaceFromStaging('fixture', preview.current.revision);
  expect(await db.getItem(7)).toEqual({
    ...fixture.items[0],
    images: [dataUrl],
    createdAt: new Date('2024-01-02T03:04:05.006Z'),
  });
});

test('a round trip preserves image bytes, duplicates, dates, ordering and optional fields', async () => {
  await db.items.bulkAdd([
    {
      id: 7,
      name: '  Book  ',
      description: '  Notes\n',
      category: 'book',
      rating: 4.5,
      images: [dataUrl, dataUrl],
      createdAt: new Date('2024-01-01'),
    },
    { id: 12, name: 'Other', category: 'other', createdAt: new Date('2024-01-01') },
  ]);
  const before = await db.getAllItems();
  const exported = await createBackup(db, options());
  const reader = new ZipReader(new BlobReader(exported.blob), { useWebWorkers: false });
  const entries = await reader.getEntries();
  const metadata = entries.find((entry) => entry.filename === 'collection.json');
  if (!metadata || metadata.directory) throw new Error('Missing metadata');
  const json = JSON.parse(await metadata.getData(new TextWriter()));
  expect(json.items[0].images).toEqual(['images/7/0.png', 'images/7/1.png']);
  await reader.close();
  const preview = await prepareRestore(db, exported.blob, 'roundtrip', options());
  await db.replaceFromStaging('roundtrip', preview.current.revision);
  expect(await db.getAllItems()).toEqual(before);
});

test('exports and restores an empty collection', async () => {
  const exported = await createBackup(db, options());
  const preview = await prepareRestore(db, exported.blob, 'empty', options());
  expect(preview.itemCount).toBe(0);
  await db.replaceFromStaging('empty', preview.current.revision);
  expect(await db.getAllItems()).toEqual([]);
});

test('rejects an export if the collection changes while it is being read', async () => {
  const generation = (await db.getCollectionState()).generation;
  await db.addItem({ name: 'First', category: 'other' }, generation);
  const changed = vi.spyOn(db.items, 'get').mockImplementationOnce(() =>
    Dexie.Promise.resolve().then(async () => {
      await db.addItem({ name: 'Second', category: 'other' }, generation);
      return { id: 1, name: 'First', category: 'other', createdAt: new Date() };
    })
  );
  try {
    await expect(createBackup(db, options())).rejects.toThrow(/changed.*download.*again/i);
  } finally {
    changed.mockRestore();
  }
});

test('explains which legacy record prevents a complete export', async () => {
  await db.items.add({
    name: 'Legacy photo',
    category: 'other',
    createdAt: new Date(),
    images: ['https://example.com/image.png'],
  });
  await expect(createBackup(db, options())).rejects.toThrow(/Legacy photo/);
});

test('rejects unexpected files and missing images without replacing any data', async () => {
  await expect(
    prepareRestore(db, await archive(fixture, png, true), 'extra', options())
  ).rejects.toThrow(/unexpected|file/i);
  const missing = { ...fixture, items: [{ ...fixture.items[0], images: ['images/7/0.webp'] }] };
  await expect(prepareRestore(db, await archive(missing), 'missing', options())).rejects.toThrow(
    /missing|image|file/i
  );
  expect(await db.stagedItems.count()).toBe(0);
  expect(await db.restoreSessions.count()).toBe(0);
});

test('cancellation removes prepared records and preserves the collection', async () => {
  const controller = new AbortController();
  await expect(
    prepareRestore(db, await archive(), 'cancel', {
      signal: controller.signal,
      onProgress: () => controller.abort(),
    })
  ).rejects.toThrow(/abort|cancel/i);
  expect(await db.stagedItems.count()).toBe(0);
  expect(await db.restoreSessions.count()).toBe(0);
});

test('rejects a corrupt ZIP checksum even when metadata is still valid JSON', async () => {
  const bytes = new Uint8Array(await (await archive()).arrayBuffer());
  const needle = new TextEncoder().encode('A book');
  let found = false;
  for (let i = 0; i < bytes.length - needle.length; i++) {
    if (needle.every((value, j) => bytes[i + j] === value)) {
      bytes[i] = 66;
      found = true;
      break;
    }
  }
  expect(found).toBe(true);
  await expect(prepareRestore(db, new Blob([bytes]), 'corrupt', options())).rejects.toThrow(
    /crc|signature|checksum|corrupt/i
  );
  expect(await db.restoreSessions.count()).toBe(0);
});

test('rejects a file above the archive limit before reading it', async () => {
  const file = new Blob();
  Object.defineProperty(file, 'size', { value: 250 * 1024 ** 2 + 1 });
  await expect(prepareRestore(db, file, 'large', options())).rejects.toThrow(/250 MB/i);
});

test('low estimated storage produces a hint instead of rejecting a valid backup', async () => {
  vi.stubGlobal('navigator', { storage: { estimate: async () => ({ usage: 999, quota: 1000 }) } });
  const preview = await prepareRestore(db, await archive(), 'low-space', options());
  expect(preview.storageWarning).toBe(true);
  expect(preview.itemCount).toBe(2);
});

test('invalid legacy image fields cannot silently disappear from an export', async () => {
  await db.items.add({
    name: 'Malformed legacy item',
    category: 'other',
    createdAt: new Date(),
    images: null,
  } as unknown as import('@/lib/db').CollectionItem);
  await expect(createBackup(db, options())).rejects.toThrow(/Malformed legacy item/);
});

test('rejects unpacked content over 10 MiB even when ZIP headers understate its size', async () => {
  const writer = new ZipWriter(new BlobWriter(), {
    useWebWorkers: false,
    level: 6,
    zip64: false,
    dataDescriptor: false,
  });
  await writer.add('collection.json', new TextReader(' '.repeat(10 * 1024 ** 2 + 1)));
  const bytes = new Uint8Array(await (await writer.close()).arrayBuffer());
  const view = new DataView(bytes.buffer);
  for (let i = 0; i + 46 <= bytes.length; i++) {
    const signature = view.getUint32(i, true);
    if (signature === 0x04034b50) view.setUint32(i + 22, 1, true);
    if (signature === 0x02014b50) view.setUint32(i + 24, 1, true);
  }
  const generation = (await db.getCollectionState()).generation;
  await db.addItem({ name: 'Keep this record', category: 'other' }, generation);
  const before = await db.getAllItems();
  await expect(prepareRestore(db, new Blob([bytes]), 'bomb', options())).rejects.toThrow(
    /size|limit/i
  );
  expect(await db.getAllItems()).toEqual(before);
  expect(await db.stagedItems.count()).toBe(0);
});

test('a quota error during preparation preserves the old collection and clears staging', async () => {
  const generation = (await db.getCollectionState()).generation;
  await db.addItem({ name: 'Keep this record', category: 'other' }, generation);
  const before = await db.getAllItems();
  const fail = (_key: unknown, value: { id: number }) => {
    if (value.id === 12) throw new DOMException('Storage full', 'QuotaExceededError');
  };
  db.stagedItems.hook('creating', fail);
  try {
    await expect(prepareRestore(db, await archive(), 'quota', options())).rejects.toThrow(
      /Storage full/
    );
    expect(await db.getAllItems()).toEqual(before);
    expect(await db.stagedItems.count()).toBe(0);
    expect(await db.restoreSessions.count()).toBe(0);
  } finally {
    db.stagedItems.hook('creating').unsubscribe(fail);
  }
});

test('rejects encrypted ZIP entries before staging them', async () => {
  const writer = new ZipWriter(new BlobWriter(), {
    useWebWorkers: false,
    password: 'fixture-password',
  });
  await writer.add('collection.json', new TextReader(JSON.stringify(fixture)));
  await expect(prepareRestore(db, await writer.close(), 'encrypted', options())).rejects.toThrow(
    /encrypted/i
  );
  expect(await db.stagedItems.count()).toBe(0);
});

test('an edited record remains portable without exporting its internal concurrency version', async () => {
  const generation = (await db.getCollectionState()).generation;
  const id = await db.addItem(
    { name: 'Before edit', category: 'book', images: [dataUrl], rating: 4.5 },
    generation
  );
  await db.updateItem(id, { name: 'After edit' }, generation, 0);
  const record = (await db.getItem(id))!;
  const exported = await createBackup(db, options());
  const reader = new ZipReader(new BlobReader(exported.blob), { useWebWorkers: false });
  try {
    const entry = (await reader.getEntries()).find((entry) => entry.filename === 'collection.json');
    if (!entry || entry.directory) throw new Error('Missing manifest');
    const manifest = JSON.parse(await entry.getData(new TextWriter()));
    expect(manifest.formatVersion).toBe(1);
    expect(manifest.items).toEqual([
      {
        id,
        name: 'After edit',
        category: 'book',
        rating: 4.5,
        images: [`images/${id}/0.png`],
        createdAt: record.createdAt.toISOString(),
      },
    ]);
  } finally {
    await reader.close();
  }
  const preview = await prepareRestore(db, exported.blob, 'edited', options());
  await db.replaceFromStaging('edited', preview.current.revision);
  const restored = (await db.getItem(id))!;
  expect(restored).toMatchObject({
    name: 'After edit',
    images: [dataUrl],
    rating: 4.5,
    createdAt: record.createdAt,
  });
  await db.updateItem(
    id,
    { description: 'Editable after restore' },
    (await db.getCollectionState()).generation,
    restored.revision ?? 0
  );
  expect((await db.getItem(id))?.description).toBe('Editable after restore');
});
