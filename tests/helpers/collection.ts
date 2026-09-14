import type { AppDatabase, CollectionItem } from '@/lib/db';

/** Seed through the same atomic replacement used by a validated backup. */
export async function seedCollection(database: AppDatabase, items: CollectionItem[]) {
  const id = crypto.randomUUID();
  await database.stagedItems.bulkAdd(items.map((item) => ({ operationId: id, id: item.id, item })));
  await database.restoreSessions.add({ id, itemCount: items.length });
  return database.replaceFromStaging(id, (await database.getCollectionState()).revision);
}
