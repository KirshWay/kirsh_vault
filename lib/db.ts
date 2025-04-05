import Dexie, { type Table } from 'dexie';

export type CollectionItem = {
  id?: number;
  name: string;
  description: string;
  imageData?: string; // base64 encoded image
  createdAt: Date;
  updatedAt: Date;
}

class VaultDB extends Dexie {
  items!: Table<CollectionItem, number>;

  constructor() {
    super('kirshVault');
    
    this.version(1).stores({
      items: '++id, name, createdAt, updatedAt'
    });
  }
}

export const db = new VaultDB();

export async function addItem(item: Omit<CollectionItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const now = new Date();
  
  return await db.items.add({
    ...item,
    createdAt: now,
    updatedAt: now
  });
}

export async function updateItem(id: number, item: Partial<Omit<CollectionItem, 'id' | 'createdAt'>>): Promise<number> {
  const now = new Date();
  await db.items.update(id, {
    ...item,
    updatedAt: now
  });
  return id;
}

export async function deleteItem(id: number): Promise<void> {
  await db.items.delete(id);
}

export async function getItems(): Promise<CollectionItem[]> {
  return await db.items.toArray();
}

export async function getItem(id: number): Promise<CollectionItem | undefined> {
  return await db.items.get(id);
} 