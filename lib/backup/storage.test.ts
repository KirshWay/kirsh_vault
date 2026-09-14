import 'fake-indexeddb/auto';

import Dexie from 'dexie';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { AppDatabase, db } from '@/lib/db';
import { seedCollection } from '@/tests/helpers/collection';

const original = {
  id: 7,
  name: 'Original',
  category: 'other' as const,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
};
const restored = { ...original, name: 'Restored' };

beforeEach(async () => {
  await db.delete();
  await db.open();
  await seedCollection(db, [original]);
});
afterEach(() => db.close());

async function stage(items = [restored], id = 'restore-1') {
  await db.stagedItems.bulkPut(items.map((item) => ({ operationId: id, id: item.id, item })));
  await db.restoreSessions.put({ id, itemCount: items.length });
  return id;
}

test('every successful mutation advances the revision atomically', async () => {
  const initial = await db.getCollectionState();
  await db.addItem({ name: 'Second', category: 'book' }, initial.generation);
  await db.updateItem(7, { name: 'Edited' }, initial.generation, 0);
  await db.deleteItem(7, initial.generation, 1);
  expect(await db.getCollectionState()).toMatchObject({ revision: initial.revision + 3, count: 1 });
  const before = await db.getCollectionState();
  await expect(db.updateItem(999, { name: 'Missing' }, before.generation, 0)).rejects.toThrow();
  expect(await db.getCollectionState()).toEqual(before);
});

test('replaces the collection, preserves identity and records the committed operation', async () => {
  const before = await db.getCollectionState();
  await db.replaceFromStaging(await stage(), before.revision);
  expect(await db.getAllItems()).toEqual([restored]);
  expect(await db.stagedItems.count()).toBe(0);
  const state = await db.getCollectionState();
  expect(state).toMatchObject({
    revision: before.revision + 1,
    lastRestoreId: 'restore-1',
    count: 1,
  });
  expect(state.generation).not.toBe(before.generation);
  await db.replaceFromStaging('restore-1', before.revision);
  expect(await db.getCollectionState()).toEqual(state);
});

test('rejects a confirmation after another tab changes the collection', async () => {
  const before = await db.getCollectionState();
  await stage();
  await db.updateItem(7, { name: 'Newer change' }, before.generation, 0);
  await expect(db.replaceFromStaging('restore-1', before.revision)).rejects.toThrow(/changed/i);
  expect((await db.getItem(7))?.name).toBe('Newer change');
});

test('rejects stale create, update and delete actions after restoration', async () => {
  const before = await db.getCollectionState();
  await db.replaceFromStaging(await stage(), before.revision);
  await expect(db.updateItem(7, { name: 'Old draft' }, before.generation, 0)).rejects.toThrow(
    /restored/i
  );
  await expect(db.deleteItem(7, before.generation, 0)).rejects.toThrow(/restored/i);
  await expect(
    db.addItem({ name: 'Old draft', category: 'other' }, before.generation)
  ).rejects.toThrow(/restored/i);
  expect(await db.getAllItems()).toEqual([restored]);
});

test('a write failure after clearing and inserting rolls back the entire replacement', async () => {
  const before = await db.getCollectionState();
  await stage([restored, { ...restored, id: 8 }]);
  const fail = (_key: unknown, value: { id: number }) => {
    if (value.id === 8) throw new DOMException('Storage full', 'QuotaExceededError');
  };
  db.items.hook('creating', fail);
  try {
    await expect(db.replaceFromStaging('restore-1', before.revision)).rejects.toThrow();
    expect(await db.getAllItems()).toEqual([original]);
    expect(await db.getCollectionState()).toEqual(before);
    expect((await db.getItemsPage(1, 12, { searchQuery: 'Original' })).items).toEqual([original]);
    expect((await db.getItemsPage(1, 12, { searchQuery: 'Restored' })).total).toBe(0);
  } finally {
    db.items.hook('creating').unsubscribe(fail);
  }
});

test.each([Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1])(
  'keeps safe, distinct IDs after restoring ID %s',
  async (id) => {
    const imported = [
      { ...original, id },
      { ...original, id: 1 },
    ];
    const state = await seedCollection(db, imported);
    const ids = [];
    for (let i = 0; i < 3; i++)
      ids.push(await db.addItem({ name: `Added ${i}`, category: 'other' }, state.generation));
    expect(ids.every((key) => Number.isSafeInteger(key) && key > 0)).toBe(true);
    expect(new Set([...ids, ...imported.map((item) => item.id)]).size).toBe(5);
    expect(await db.getItem(id)).toEqual(imported[0]);
    await db.deleteItem(ids.at(-1)!, state.generation, 0);
    db.close();
    await db.open();
    expect(
      await db.addItem({ name: 'After deletion', category: 'other' }, state.generation)
    ).not.toBe(ids.at(-1));
  }
);

test('recovers an exhausted native generator, including after an empty restore', async () => {
  await db.items.put({ ...original, id: Number.MAX_SAFE_INTEGER + 1 });
  await db.items.clear();
  db.close();
  await db.open();
  const state = await seedCollection(db, []);
  const id = await db.addItem({ name: 'Recovered', category: 'other' }, state.generation);
  expect(Number.isSafeInteger(id)).toBe(true);
  expect((await db.getItem(id))?.name).toBe('Recovered');
});

test('never reuses a deleted imported ID for an older draft in the same generation', async () => {
  const state = await seedCollection(db, [
    { ...original, id: 1 },
    { ...original, id: Number.MAX_SAFE_INTEGER },
  ]);
  await db.deleteItem(1, state.generation, 0);
  const id = await db.addItem({ name: 'New item', category: 'other' }, state.generation);
  expect(id).not.toBe(1);
  await expect(db.updateItem(1, { name: 'Old draft' }, state.generation, 0)).rejects.toThrow(
    /deleted/
  );
  expect((await db.getItem(id))?.name).toBe('New item');
});

test('serializes allocation between separate connections', async () => {
  const state = await seedCollection(db, [{ ...original, id: Number.MAX_SAFE_INTEGER }]);
  const second = new AppDatabase();
  try {
    const ids = await Promise.all(
      [db, second, db, second].map((database, i) =>
        database.addItem({ name: `Tab ${i}`, category: 'other' }, state.generation)
      )
    );
    expect(new Set(ids).size).toBe(4);
    expect(ids.every(Number.isSafeInteger)).toBe(true);
    expect((await db.getCollectionState()).revision).toBe(state.revision + 4);
  } finally {
    second.close();
  }
});

test('a failed creation rolls back its allocation and revision', async () => {
  const before = await db.getCollectionState();
  const fail = () => {
    throw new DOMException('Storage full', 'QuotaExceededError');
  };
  db.items.hook('creating', fail);
  try {
    await expect(
      db.addItem({ name: 'Failed', category: 'other' }, before.generation)
    ).rejects.toThrow();
    expect(await db.getCollectionState()).toEqual(before);
  } finally {
    db.items.hook('creating').unsubscribe(fail);
  }
  const id = await db.addItem({ name: 'Retry', category: 'other' }, before.generation);
  expect(await db.getItem(id)).toMatchObject({ name: 'Retry' });
});

test('version 3 migration preserves metadata and records while making existing items searchable', async () => {
  await db.delete();
  const legacy = new Dexie('kirshVault');
  legacy.version(3).stores({
    items: '++id, name, createdAt, category, [category+createdAt]',
    metadata: 'key',
    stagedItems: '[operationId+id], operationId',
    restoreSessions: 'id',
  });
  const metadata = {
    key: 'collection',
    revision: 42,
    generation: 'existing',
    lastRestoreId: 'done',
  };
  const record = { ...original, id: Number.MAX_SAFE_INTEGER, images: ['unchanged bytes'] };
  await legacy.table('items').put(record);
  await legacy.table('metadata').put(metadata);
  legacy.close();
  await db.open();
  expect(await db.getCollectionState()).toMatchObject(metadata);
  expect((await db.getItemsPage(1, 12, { searchQuery: 'Original' })).items).toEqual([record]);
  const ids = await Promise.all(
    [0, 1, 2].map((i) =>
      db.addItem({ name: `After upgrade ${i}`, category: 'other' }, metadata.generation)
    )
  );
  expect(ids.every(Number.isSafeInteger)).toBe(true);
  expect(new Set(ids).size).toBe(3);
});

test('restores an empty collection only from a completed preparation', async () => {
  const before = await db.getCollectionState();
  await expect(db.replaceFromStaging('missing', before.revision)).rejects.toThrow();
  expect(await db.getAllItems()).toEqual([original]);
  await db.replaceFromStaging(await stage([]), before.revision);
  expect(await db.getAllItems()).toEqual([]);
});

test('upgrading a version 2 database preserves records and initializes collection state', async () => {
  await db.delete();
  const old = new Dexie('kirshVault');
  old.version(2).stores({ items: '++id, name, createdAt, category, [category+createdAt]' });
  await old.open();
  await old.table('items').add(original);
  old.close();
  await db.open();
  expect(await db.getAllItems()).toEqual([original]);
  expect(await db.getCollectionState()).toMatchObject({ revision: 0, count: 1 });
});
