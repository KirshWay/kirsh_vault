import { useEffect, useState } from 'react';

import { useDb } from '@/lib/context/DbContext';
import { CollectionItem } from '@/lib/db';
import { FormValues } from '@/types';

export const useCollectionItems = () => {
  const db = useDb();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const allItems = await db.getAllItems();
    setItems(allItems);
  };

  const addItem = async (data: FormValues) => {
    const newItem = await db.addItem(data);

    if (typeof newItem === 'number') {
      const addedItem = await db.getItem(newItem);

      if (addedItem) {
        setItems((prevItems) => [addedItem, ...prevItems]);
      }
    } else if (newItem !== false) {
      await loadItems();
    }

    return newItem !== false;
  };

  const updateItem = async (id: number, data: FormValues) => {
    const success = await db.updateItem(id, data);

    if (success) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                name: data.name,
                description: data.description,
                category: data.category,
                images: data.images || [],
                rating: data.rating,
              }
            : item
        )
      );
    }

    return success;
  };

  const deleteItem = async (id: number) => {
    const success = await db.deleteItem(id);
    if (success) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const toggleExpandItem = (id: number) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  return {
    items,
    isLoading: db.isLoading,
    expandedItemId,
    addItem,
    updateItem,
    deleteItem,
    toggleExpandItem,
  };
};
