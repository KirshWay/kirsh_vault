import Dexie, { type Table } from 'dexie';

export type ItemCategory = 'book' | 'movie' | 'other';

export type CollectionItem = {
  id?: number;
  name: string;
  description?: string;
  images?: string[];
  createdAt: Date;
  category: ItemCategory;
};

class AppDatabase extends Dexie {
  items!: Table<CollectionItem>;

  constructor() {
    super('kirshVault');

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

export const db = new AppDatabase();

export default db;
