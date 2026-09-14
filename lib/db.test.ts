import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { seedCollection } from '@/tests/helpers/collection';

import { CollectionItem, db, ItemCategory } from './db';

describe('Database API Testing', () => {
  let testItems: CollectionItem[];

  beforeEach(async () => {
    await db.delete();
    await db.open();

    testItems = [
      {
        id: 1,
        name: 'War and Peace',
        description: "Tolstoy's epic novel",
        category: 'book',
        rating: 9,
        createdAt: new Date('2023-01-01'),
      },
      {
        id: 2,
        name: 'Interstellar',
        description: 'Space sci-fi movie',
        category: 'movie',
        rating: 8,
        createdAt: new Date('2023-01-02'),
      },
      {
        id: 3,
        name: 'Notes',
        description: 'Personal notes',
        category: 'other',
        createdAt: new Date('2023-01-03'),
      },
    ];

    await seedCollection(db, testItems);
  });

  afterEach(() => {
    db.close();
  });

  test('getAllItems should return all items sorted by date', async () => {
    const items = await db.getAllItems();

    expect(items.length).toBe(3);
    expect(items[0].id).toBe(3);
    expect(items[1].id).toBe(2);
    expect(items[2].id).toBe(1);
  });

  test('getItemsByCategory should return items of selected category', async () => {
    const books = await db.getItemsByCategory('book');
    const movies = await db.getItemsByCategory('movie');
    const others = await db.getItemsByCategory('other');

    expect(books.length).toBe(1);
    expect(books[0].name).toBe('War and Peace');

    expect(movies.length).toBe(1);
    expect(movies[0].name).toBe('Interstellar');

    expect(others.length).toBe(1);
    expect(others[0].name).toBe('Notes');
  });

  test('addItem should add new item with creation date', async () => {
    const dateBeforeAdd = new Date();

    const newItem = {
      name: 'New Item',
      description: 'Test description',
      category: 'book' as ItemCategory,
      rating: 7,
    };

    const newItemId = await db.addItem(newItem, (await db.getCollectionState()).generation);
    expect(typeof newItemId).toBe('number');

    const addedItem = await db.getItem(newItemId);
    expect(addedItem).toBeDefined();
    expect(addedItem?.name).toBe('New Item');
    expect(addedItem?.description).toBe('Test description');
    expect(addedItem?.category).toBe('book');
    expect(addedItem?.rating).toBe(7);

    expect(addedItem?.createdAt).toBeInstanceOf(Date);
    expect(addedItem?.createdAt.getTime()).toBeGreaterThanOrEqual(dateBeforeAdd.getTime());

    const allItems = await db.getAllItems();
    expect(allItems.length).toBe(4);
  });

  test('updateItem should update existing item', async () => {
    const updates = {
      name: 'Updated title',
      description: 'Updated description',
      rating: 10,
    };

    await db.updateItem(1, updates, (await db.getCollectionState()).generation, 0);

    const updatedItem = await db.getItem(1);
    expect(updatedItem).toBeDefined();
    expect(updatedItem?.name).toBe('Updated title');
    expect(updatedItem?.description).toBe('Updated description');
    expect(updatedItem?.rating).toBe(10);
    expect(updatedItem?.category).toBe('book');
  });

  test('deleteItem should remove item', async () => {
    await db.deleteItem(1, (await db.getCollectionState()).generation, 0);

    const deletedItem = await db.getItem(1);
    expect(deletedItem).toBeUndefined();

    const allItems = await db.getAllItems();
    expect(allItems.length).toBe(2);
  });

  test('getItem should return item by ID', async () => {
    const item = await db.getItem(2);

    expect(item).toBeDefined();
    expect(item?.id).toBe(2);
    expect(item?.name).toBe('Interstellar');
    expect(item?.category).toBe('movie');
    expect(item?.rating).toBe(8);
  });

  test('getItemsPage returns newest items first and correct page boundaries', async () => {
    const first = await db.getItemsPage(1, 2);
    expect(first.items.map((item) => item.id)).toEqual([3, 2]);
    expect(first).toMatchObject({ total: 3, totalPages: 2, hasNext: true, hasPrev: false });

    const second = await db.getItemsPage(2, 2);
    expect(second.items.map((item) => item.id)).toEqual([1]);
    expect(second).toMatchObject({ total: 3, totalPages: 2, hasNext: false, hasPrev: true });
  });

  test('getItemsByCategoryPage counts and paginates only the selected category', async () => {
    await db.items.add({
      id: 4,
      name: 'Another book',
      category: 'book',
      createdAt: new Date('2023-01-04'),
    });

    const page = await db.getItemsByCategoryPage('book', 2, 1);
    expect(page.items.map((item) => item.id)).toEqual([1]);
    expect(page).toMatchObject({ total: 2, totalPages: 2, hasNext: false, hasPrev: true });
  });

  test('existing records and image data survive closing and reopening the database', async () => {
    const images = ['data:image/png;base64,aGVsbG8='];
    await db.updateItem(
      1,
      { images, description: 'Saved description' },
      (await db.getCollectionState()).generation,
      0
    );
    db.close();
    await db.open();

    expect(await db.getItem(1)).toMatchObject({
      name: 'War and Peace',
      category: 'book',
      createdAt: new Date('2023-01-01'),
      description: 'Saved description',
      images,
    });
    expect(await db.items.count()).toBe(3);
  });
});

describe('Filtered pagination', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedCollection(
      db,
      Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        name: i === 0 ? 'Needle' : `Book ${i + 1}`,
        category: 'book' as const,
        rating: i === 0 ? 9 : 2,
        createdAt: new Date(2020, 0, i + 1),
      }))
    );
  });
  afterEach(() => db.close());

  test('search and filters run before pagination and preserve the full count', async () => {
    const page = await db.getItemsPage(1, 12, {
      searchQuery: 'Needle',
      ratingFilter: { type: 'min', minValue: 8 },
    });
    expect(page.items.map((item) => item.id)).toEqual([1]);
    expect(page).toMatchObject({ total: 1, collectionTotal: 30, totalPages: 1 });
  });

  test('category pagination reads only the requested records', async () => {
    let reads = 0;
    const observe = (item: CollectionItem) => {
      reads++;
      return item;
    };
    db.items.hook('reading', observe);
    try {
      const page = await db.getItemsByCategoryPage('book', 1, 12);
      expect(page.items).toHaveLength(12);
      expect(reads).toBe(12);
    } finally {
      db.items.hook('reading').unsubscribe(observe);
    }
  });

  test.each([{ searchQuery: 'Needle' }, { ratingFilter: { type: 'min' as const, minValue: 8 } }])(
    'filtered pagination loads full records only for the visible matches: %j',
    async (filters) => {
      const images = ['data:image/png;base64,' + 'a'.repeat(100_000)];
      await db.updateItem(1, { images }, (await db.getCollectionState()).generation, 0);
      const reads: number[] = [];
      const observe = (item: CollectionItem) => {
        reads.push(item.id);
        return item;
      };
      db.items.hook('reading', observe);
      try {
        const page = await db.getItemsPage(1, 12, filters);
        expect(page.items.map((item) => item.id)).toEqual([1]);
        expect(page.items[0].images).toEqual(images);
        expect(reads).toEqual([1]);
      } finally {
        db.items.hook('reading').unsubscribe(observe);
      }
    }
  );

  test('search reflects creates, edits, category changes, deletions and empty restore', async () => {
    const { generation } = await db.getCollectionState();
    const id = await db.addItem({ name: 'Unique', category: 'book', rating: 9 }, generation);
    expect(
      (await db.getItemsPage(1, 12, { searchQuery: 'Unique' })).items.map((item) => item.id)
    ).toEqual([id]);
    await db.updateItem(id, { name: 'Renamed', category: 'movie', rating: 2 }, generation, 0);
    expect((await db.getItemsPage(1, 12, { searchQuery: 'Unique' })).total).toBe(0);
    expect(
      (await db.getItemsPage(1, 12, { searchQuery: 'Renamed', category: 'movie' })).total
    ).toBe(1);
    await db.deleteItem(id, generation, 1);
    expect((await db.getItemsPage(1, 12, { searchQuery: 'Renamed' })).total).toBe(0);
    await seedCollection(db, []);
    expect((await db.getItemsPage(1, 12, { searchQuery: 'Needle' })).total).toBe(0);
  });

  test('requests beyond the final page are clamped to an existing page', async () => {
    const page = await db.getItemsPage(4, 12);
    expect(page.page).toBe(3);
    expect(page.items.map((item) => item.id)).toEqual([6, 5, 4, 3, 2, 1]);
  });
});

test('version-one records survive the compound-index migration', async () => {
  const { default: Dexie } = await import('dexie');
  await db.delete();
  const legacy = new Dexie('kirshVault');
  legacy.version(1).stores({ items: '++id, name, createdAt, category' });
  const record = {
    id: 10,
    name: 'Legacy item',
    category: 'book',
    createdAt: new Date('2020-01-01'),
    images: ['data:image/png;base64,bGVnYWN5'],
  };
  await legacy.table('items').add(record);
  legacy.close();
  await db.open();
  try {
    expect(await db.getItem(10)).toEqual(record);
    expect((await db.getItemsByCategoryPage('book', 1, 12)).items).toEqual([record]);
  } finally {
    db.close();
  }
});
