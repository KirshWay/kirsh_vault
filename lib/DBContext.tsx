'use client';
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CollectionItem } from './db';
import toast from 'react-hot-toast';

type DBContextType = {
  items: CollectionItem[];
  loading: boolean;
  addItem: (item: Omit<CollectionItem, 'id' | 'createdAt'>) => Promise<void>;
  updateItem: (id: number, item: Partial<Omit<CollectionItem, 'id' | 'createdAt'>>) => Promise<void>;
  deleteItem: (id: number) => Promise<void>;
}

const DBContext = createContext<DBContextType | undefined>(undefined);

export function DBProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);

  const items = useLiveQuery(
    () => db.items.toArray(),
    [],
    []
  ) || [];

  useEffect(() => {
    setLoading(items === undefined);
  }, [items]);

  const handleAddItem = async (item: Omit<CollectionItem, 'id' | 'createdAt'>) => {
    try {
      await db.addItem(item);
      toast.success('Item added successfully');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleUpdateItem = async (id: number, item: Partial<Omit<CollectionItem, 'id' | 'createdAt'>>) => {
    try {
      await db.updateItem(id, item);
      toast.success('Item updated successfully');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await db.deleteItem(id);
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  return (
    <DBContext.Provider
      value={{
        items,
        loading,
        addItem: handleAddItem,
        updateItem: handleUpdateItem,
        deleteItem: handleDeleteItem,
      }}
    >
      {children}
    </DBContext.Provider>
  );
}

export function useDB() {
  const context = useContext(DBContext);
  if (context === undefined) {
    throw new Error('useDB must be used within a DBProvider');
  }
  return context;
} 