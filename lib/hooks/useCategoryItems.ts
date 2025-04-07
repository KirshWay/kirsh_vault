import { useEffect, useState } from 'react';

import { useDb } from '@/lib/context/DbContext';
import { CollectionItem, ItemCategory } from '@/lib/db';
import { FormValues } from '@/types';

export const useCategoryItems = (category: ItemCategory) => {
  const db = useDb();
  const [items, setItems] = useState<CollectionItem[]>([]);

  const loadItems = async () => {
    const categoryItems = await db.getItemsByCategory(category);
    setItems(categoryItems);
  };

  useEffect(() => {
    loadItems();
  }, [category]);

  const addItem = async (data: FormValues) => {
    const newItem = await db.addItem({
      ...data,
      category,
    });

    if (newItem) {
      await loadItems();
      return true;
    }

    return false;
  };

  const updateItem = async (id: number, data: FormValues) => {
    const updates = {
      ...data,
      category,
    };

    await db.updateItem(id, updates);
    await loadItems();
    return true;
  };

  const deleteItem = async (id: number) => {
    await db.deleteItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    return true;
  };

  return {
    items,
    isLoading: db.isLoading,
    loadItems,
    addItem,
    updateItem,
    deleteItem,
  };
};
