import Dexie, { type EntityTable } from 'dexie';

import type { FormValues } from '@/types';

import { ITEM_CATEGORIES } from './constants';
import { filterItems, type ItemFilters } from './search';

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export type CollectionItem = FormValues & {
  id: number;
  createdAt: Date;
};

export type PaginationResult<T> = {
  items: T[];
  total: number;
  collectionTotal: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export class AppDatabase extends Dexie {
  items!: EntityTable<CollectionItem, 'id'>;

  constructor() {
    super('kirshVault');

    this.version(1).stores({ items: '++id, name, createdAt, category' });
    this.version(2).stores({ items: '++id, name, createdAt, category, [category+createdAt]' });
  }

  async getAllItems(): Promise<CollectionItem[]> {
    return this.items.orderBy('createdAt').reverse().toArray();
  }

  private orderedItems(category?: ItemFilters['category']) {
    return category
      ? this.items
          .where('[category+createdAt]')
          .between([category, Dexie.minKey], [category, Dexie.maxKey])
          .reverse()
      : this.items.orderBy('createdAt').reverse();
  }

  async getItemsByCategory(category: ItemCategory): Promise<CollectionItem[]> {
    return this.orderedItems(category).toArray();
  }

  async getItemsPage(
    page: number,
    limit: number,
    filters: ItemFilters = {}
  ): Promise<PaginationResult<CollectionItem>> {
    if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(page)) {
      throw new RangeError('Invalid pagination');
    }
    return this.transaction('r', this.items, async () => {
      const collectionTotal = await this.orderedItems(filters.category).count();
      const matches =
        filters.searchQuery?.trim() || filters.ratingFilter
          ? filterItems(await this.orderedItems(filters.category).toArray(), filters)
          : null;
      const total = matches?.length ?? collectionTotal;
      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.max(1, Math.min(Math.trunc(page), totalPages));
      const offset = (currentPage - 1) * limit;
      const items = matches
        ? matches.slice(offset, offset + limit)
        : await this.orderedItems(filters.category).offset(offset).limit(limit).toArray();
      return {
        items,
        total,
        collectionTotal,
        page: currentPage,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      };
    });
  }

  getItemsByCategoryPage(category: ItemCategory, page: number, limit: number) {
    return this.getItemsPage(page, limit, { category });
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
    const updated = await this.items.update(id, updates);
    if (!updated) throw new Error('This item no longer exists.');
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
