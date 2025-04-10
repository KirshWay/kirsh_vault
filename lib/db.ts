import Dexie, { type Table } from 'dexie';

export type ItemCategory = 'book' | 'movie' | 'other';

export type CollectionItem = {
  id?: number;
  name: string;
  description?: string;
  images?: string[];
  createdAt: Date;
  category: ItemCategory;
  rating?: number;
};

export type PaginationResult<T> = {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
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

  async getItemsPage(page: number, limit: number): Promise<PaginationResult<CollectionItem>> {
    const offset = (page - 1) * limit;

    const total = await this.items.count();
    const totalPages = Math.ceil(total / limit);

    const items = await this.items
      .orderBy('createdAt')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();

    return {
      items,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async getItemsByCategoryPage(
    category: ItemCategory,
    page: number,
    limit: number
  ): Promise<PaginationResult<CollectionItem>> {
    const offset = (page - 1) * limit;

    const total = await this.items.where('category').equals(category).count();
    const totalPages = Math.ceil(total / limit);

    const items = await this.items
      .where('category')
      .equals(category)
      .sortBy('createdAt', (items) => {
        return items.reverse().slice(offset, offset + limit);
      });

    return {
      items,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
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
