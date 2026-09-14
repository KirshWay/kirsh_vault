import 'fake-indexeddb/auto';

import { afterEach, beforeEach, expect, test } from 'vitest';

import { AppDatabase, db } from '@/lib/db';
import { seedCollection } from '@/tests/helpers/collection';

const otherTab = new AppDatabase();
let generation: string;
beforeEach(async () => {
  await db.delete();
  await db.open();
  generation = (
    await seedCollection(db, [
      {
        id: 1,
        name: 'Original',
        description: 'Original description',
        category: 'book',
        createdAt: new Date('2020-01-01'),
        images: ['original.png'],
      },
    ])
  ).generation;
  await otherTab.open();
});
afterEach(() => {
  otherTab.close();
  db.close();
});

test('rejects an outdated edit without overwriting another tab or advancing collection revision', async () => {
  await otherTab.updateItem(
    1,
    { description: 'New description', images: ['new.png'] },
    generation,
    0
  );
  const before = await db.getCollectionState();
  await expect(
    db.updateItem(
      1,
      { name: 'Stale draft', description: 'Original description', images: ['original.png'] },
      generation,
      0
    )
  ).rejects.toThrow(/changed/i);
  expect(await db.getItem(1)).toMatchObject({
    name: 'Original',
    description: 'New description',
    images: ['new.png'],
  });
  expect(await db.getCollectionState()).toEqual(before);
});

test('only one concurrent edit can commit from the same item version', async () => {
  const results = await Promise.allSettled([
    db.updateItem(1, { name: 'First tab' }, generation, 0),
    otherTab.updateItem(1, { name: 'Second tab' }, generation, 0),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
});

test('rejects deletion when the confirmed record has changed', async () => {
  await otherTab.updateItem(1, { name: 'Updated elsewhere' }, generation, 0);
  const before = await db.getCollectionState();
  await expect(db.deleteItem(1, generation, 0)).rejects.toThrow(/changed/i);
  expect((await db.getItem(1))?.name).toBe('Updated elsewhere');
  expect(await db.getCollectionState()).toEqual(before);
});

test('unrelated writes do not invalidate an edit, and reopening allows the next edit', async () => {
  await otherTab.addItem({ name: 'Unrelated', category: 'other' }, generation);
  await db.updateItem(1, { name: 'First edit' }, generation, 0);
  const reopened = (await otherTab.getItem(1))!;
  await otherTab.updateItem(1, { name: 'Second edit' }, generation, reopened.revision ?? 0);
  expect((await db.getItem(1))?.name).toBe('Second edit');
});
