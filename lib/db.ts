import Dexie, { type EntityTable, type Table } from 'dexie';

import type { FormValues } from '@/types';

import { ITEM_CATEGORIES } from './constants';
import { filterItems, type ItemFilters } from './search';

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export type CollectionItem = FormValues & {
  id: number;
  createdAt: Date;
  // Internal optimistic-lock version. Legacy and restored records start at zero.
  revision?: number;
};

type ItemSummary = Omit<CollectionItem, 'images'>;

function summarizeItem(item: CollectionItem): ItemSummary {
  const summary = { ...item };
  delete summary.images;
  return summary;
}

export type CollectionMetadata = {
  key: 'collection';
  revision: number;
  generation: string;
  nextItemId: number;
  lastRestoreId?: string;
};
export type CollectionState = CollectionMetadata & { count: number };

export class StaleCollectionError extends Error {
  constructor() {
    super('The collection was restored. Reopen this item before making changes.');
  }
}
export class ItemChangedError extends Error {
  constructor() {
    super(
      'This item changed or was deleted in another tab. Close this window and reopen the item before trying again.'
    );
  }
}
export class CollectionChangedError extends Error {
  constructor(
    message = 'The collection changed. Review the current collection and confirm again.'
  ) {
    super(message);
  }
}

const initialMetadata = (): CollectionMetadata => ({
  key: 'collection',
  revision: 0,
  generation: crypto.randomUUID(),
  nextItemId: 1,
});

export type PaginationResult<T> = {
  generation: string;
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
  itemSummaries!: EntityTable<ItemSummary, 'id'>;
  retiredItemIds!: EntityTable<{ id: number }, 'id'>;
  metadata!: EntityTable<CollectionMetadata, 'key'>;
  stagedItems!: Table<{ operationId: string; id: number; item: CollectionItem }, [string, number]>;
  restoreSessions!: EntityTable<{ id: string; itemCount: number }, 'id'>;

  constructor() {
    super('kirshVault');

    this.version(1).stores({ items: '++id, name, createdAt, category' });
    this.version(2).stores({ items: '++id, name, createdAt, category, [category+createdAt]' });
    this.version(3)
      .stores({
        items: '++id, name, createdAt, category, [category+createdAt]',
        metadata: 'key',
        stagedItems: '[operationId+id], operationId',
        restoreSessions: 'id',
      })
      .upgrade((tx) =>
        tx
          .table('metadata')
          .put(initialMetadata())
          .then(() => {})
      );
    this.version(4)
      .stores({ itemSummaries: 'id, createdAt, [category+createdAt]', retiredItemIds: 'id' })
      .upgrade(async (tx) => {
        const metadata = tx.table('metadata');
        await metadata.update('collection', { nextItemId: 1 });
        // Read one full record at a time; existing collections can contain large images.
        const items = tx.table<CollectionItem>('items');
        for (const key of await items.toCollection().primaryKeys()) {
          const item = await items.get(key);
          if (item) await tx.table('itemSummaries').add(summarizeItem(item));
        }
      });
    this.on('populate', (tx) =>
      tx
        .table('metadata')
        .put(initialMetadata())
        .then(() => {})
    );
  }

  private async collectionMetadata() {
    const metadata = await this.metadata.get('collection');
    if (!metadata) throw new Error('Collection metadata is unavailable. Reload the app.');
    return metadata;
  }

  getCollectionState(): Promise<CollectionState> {
    return this.transaction('r', this.items, this.metadata, async () => ({
      ...(await this.collectionMetadata()),
      count: await this.items.count(),
    }));
  }

  private async mutate<T>(
    generation: string,
    operation: (metadata: CollectionMetadata) => Promise<T>
  ): Promise<T> {
    return this.transaction(
      'rw',
      [this.items, this.itemSummaries, this.retiredItemIds, this.metadata],
      async () => {
        const metadata = await this.collectionMetadata();
        if (generation !== metadata.generation) throw new StaleCollectionError();
        const result = await operation(metadata);
        await this.metadata.put({ ...metadata, revision: metadata.revision + 1 });
        return result;
      }
    );
  }

  replaceFromStaging(operationId: string, expectedRevision: number) {
    return this.transaction(
      'rw',
      [
        this.items,
        this.itemSummaries,
        this.retiredItemIds,
        this.metadata,
        this.stagedItems,
        this.restoreSessions,
      ],
      async () => {
        const metadata = await this.collectionMetadata();
        if (metadata.lastRestoreId === operationId) return metadata;
        if (metadata.revision !== expectedRevision) throw new CollectionChangedError();
        const session = await this.restoreSessions.get(operationId);
        const staged = this.stagedItems.where('operationId').equals(operationId);
        if (!session || (await staged.count()) !== session.itemCount) {
          throw new Error('The prepared backup is unavailable. Select the file again.');
        }
        await this.items.clear();
        await this.itemSummaries.clear();
        await this.retiredItemIds.clear();
        // Only IndexedDB work belongs in this transaction. Decode files before entering it.
        for (const key of await staged.primaryKeys()) {
          const entry = await this.stagedItems.get(key);
          if (!entry) throw new Error('A prepared item is missing.');
          await this.items.add(entry.item);
          await this.itemSummaries.add(summarizeItem(entry.item));
        }
        const next = {
          ...metadata,
          revision: metadata.revision + 1,
          generation: crypto.randomUUID(),
          nextItemId: 1,
          lastRestoreId: operationId,
        };
        await this.metadata.put(next);
        await staged.delete();
        await this.restoreSessions.delete(operationId);
        return next;
      }
    );
  }

  async getAllItems(): Promise<CollectionItem[]> {
    return this.items.orderBy('createdAt').reverse().toArray();
  }

  private orderedItems<T extends ItemSummary>(
    category: ItemFilters['category'],
    table: EntityTable<T, 'id'>
  ) {
    return category
      ? table
          .where('[category+createdAt]')
          .between([category, Dexie.minKey], [category, Dexie.maxKey])
          .reverse()
      : table.orderBy('createdAt').reverse();
  }

  async getItemsByCategory(category: ItemCategory): Promise<CollectionItem[]> {
    return this.orderedItems(category, this.items).toArray();
  }

  async getItemsPage(
    page: number,
    limit: number,
    filters: ItemFilters = {}
  ): Promise<PaginationResult<CollectionItem>> {
    if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(page)) {
      throw new RangeError('Invalid pagination');
    }
    return this.transaction('r', [this.items, this.itemSummaries, this.metadata], async () => {
      const { generation } = await this.collectionMetadata();
      const collectionTotal = await this.orderedItems(filters.category, this.items).count();
      const matches =
        filters.searchQuery?.trim() || filters.ratingFilter
          ? filterItems(
              await this.orderedItems(filters.category, this.itemSummaries).toArray(),
              filters
            )
          : null;
      const total = matches?.length ?? collectionTotal;
      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.max(1, Math.min(Math.trunc(page), totalPages));
      const offset = (currentPage - 1) * limit;
      const items = matches
        ? (
            await this.items.bulkGet(matches.slice(offset, offset + limit).map((item) => item.id))
          ).map((item) => {
            if (!item)
              throw new Error('The collection search index is inconsistent. Reload the app.');
            return item;
          })
        : await this.orderedItems(filters.category, this.items)
            .offset(offset)
            .limit(limit)
            .toArray();
      return {
        generation,
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

  async addItem(item: FormValues, generation: string): Promise<number> {
    const timestamp = new Date();
    return this.mutate(generation, async (metadata) => {
      // Imported IDs can exhaust IndexedDB's native generator. Allocate explicit safe
      // keys and retain the cursor across deletions so open drafts cannot target reused IDs.
      let id = metadata.nextItemId;
      const keys = [
        ...(await this.items.where(':id').aboveOrEqual(id).primaryKeys()),
        ...(await this.retiredItemIds.where(':id').aboveOrEqual(id).primaryKeys()),
      ].sort((a, b) => a - b);
      for (const key of keys) {
        if (key < id) continue;
        if (key !== id) break;
        id++;
      }
      if (!Number.isSafeInteger(id) || id < 1)
        throw new Error('No safe item IDs remain in this collection.');
      const record = {
        ...item,
        id,
        createdAt: timestamp,
      };
      await this.items.add(record);
      await this.itemSummaries.add(summarizeItem(record));
      metadata.nextItemId = id + 1;
      return id;
    });
  }

  async updateItem(
    id: number,
    updates: Partial<FormValues>,
    generation: string,
    expectedRevision: number
  ): Promise<void> {
    return this.mutate(generation, async () => {
      const current = await this.requireItemVersion(id, expectedRevision);
      const item = { ...current, ...updates, revision: (current.revision ?? 0) + 1 };
      await this.items.put(item);
      await this.itemSummaries.put(summarizeItem(item));
    });
  }

  async deleteItem(id: number, generation: string, expectedRevision: number): Promise<void> {
    await this.mutate(generation, async (metadata) => {
      await this.requireItemVersion(id, expectedRevision);
      // An imported ID may lie ahead of the allocation cursor. Remember its deletion
      // until the next restore changes generation and invalidates every open draft.
      if (id >= metadata.nextItemId) await this.retiredItemIds.put({ id });
      await this.items.delete(id);
      await this.itemSummaries.delete(id);
    });
  }

  private async requireItemVersion(id: number, expectedRevision: number) {
    const item = await this.items.get(id);
    if (!item || (item.revision ?? 0) !== expectedRevision) throw new ItemChangedError();
    return item;
  }

  async getItem(id: number): Promise<CollectionItem | undefined> {
    return this.items.get(id);
  }
}

export const db = new AppDatabase();

export default db;
