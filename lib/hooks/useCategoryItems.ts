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

  return {
    items,
    isLoading: db.isLoading,
    loadItems,
    addItem,
  };
};
