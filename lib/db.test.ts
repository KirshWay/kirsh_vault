import 'fake-indexeddb/auto';

import Dexie from 'dexie';
import { beforeEach, describe, expect, test } from 'vitest';

import { CollectionItem, ItemCategory } from './db';

class TestDatabase extends Dexie {
  items!: Dexie.Table<CollectionItem, number>;

  constructor() {
    super('testDatabase');
    this.version(1).stores({
      items: '++id, name, createdAt, category',
    });
  }

  async getAllItems(): Promise<CollectionItem[]> {
    return this.items.orderBy('createdAt').reverse().toArray();
  }

  async getItemsByCategory(category: ItemCategory): Promise<CollectionItem[]> {
    return this.items
      .where('category')
      .equals(category)
      .sortBy('createdAt', (items) => items.reverse());
  }

  async addItem(item: Omit<CollectionItem, 'id' | 'createdAt'>): Promise<number> {
    const timestamp = new Date();
    return this.items.add({
      ...item,
      createdAt: timestamp,
    });
  }

  async updateItem(
    id: number,
    updates: Partial<Omit<CollectionItem, 'id' | 'createdAt'>>
  ): Promise<void> {
    await this.items.update(id, updates);
  }

  async deleteItem(id: number): Promise<void> {
    await this.items.delete(id);
  }

  async getItem(id: number): Promise<CollectionItem | undefined> {
    return this.items.get(id);
  }
}

describe('Database API Testing', () => {
  let db: TestDatabase;
  let testItems: CollectionItem[];

  beforeEach(async () => {
    db = new TestDatabase();
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

    await db.items.bulkAdd(testItems);
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

    const newItemId = await db.addItem(newItem);
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

    await db.updateItem(1, updates);

    const updatedItem = await db.getItem(1);
    expect(updatedItem).toBeDefined();
    expect(updatedItem?.name).toBe('Updated title');
    expect(updatedItem?.description).toBe('Updated description');
    expect(updatedItem?.rating).toBe(10);
    expect(updatedItem?.category).toBe('book');
  });

  test('deleteItem should remove item', async () => {
    await db.deleteItem(1);

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
});
