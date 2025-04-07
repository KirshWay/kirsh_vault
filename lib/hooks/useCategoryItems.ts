import { useEffect, useState } from 'react';

import { useDb } from '@/lib/context/DbContext';
import { CollectionItem, ItemCategory, PaginationResult } from '@/lib/db';
import { FormValues } from '@/types';

import { DEFAULT_PAGE_SIZE } from './useCollectionItems';

export const useCategoryItems = (
  category: ItemCategory,
  initialPage = 1,
  pageSize = DEFAULT_PAGE_SIZE
) => {
  const db = useDb();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [pagination, setPagination] = useState<Omit<PaginationResult<CollectionItem>, 'items'>>({
    total: 0,
    page: initialPage,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = async (page = pagination.page) => {
    setIsLoading(true);
    try {
      const result = await db.getItemsByCategoryPage(category, page, pageSize);
      setItems(result.items);
      setPagination({
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrev: result.hasPrev,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems(initialPage);
  }, [category, initialPage, pageSize]);

  const changePage = async (newPage: number) => {
    if (newPage === pagination.page) return;
    await loadItems(newPage);
  };

  const addItem = async (data: FormValues) => {
    const newItem = await db.addItem({
      ...data,
      category,
    });

    if (newItem) {
      if (pagination.page === 1) {
        await loadItems(1);
      } else {
        setPagination((prev) => ({
          ...prev,
          total: prev.total + 1,
          totalPages: Math.ceil((prev.total + 1) / pageSize),
          hasNext: prev.page < Math.ceil((prev.total + 1) / pageSize),
        }));
      }
      return true;
    }

    return false;
  };

  const updateItem = async (id: number, data: FormValues) => {
    const updates = {
      ...data,
      category,
    };

    const success = await db.updateItem(id, updates);

    if (success) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...updates,
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

      if (items.length === 1 && pagination.hasPrev) {
        await loadItems(pagination.page - 1);
      } else if (items.length <= pageSize && pagination.total > items.length) {
        await loadItems(pagination.page);
      } else {
        setPagination((prev) => ({
          ...prev,
          total: prev.total - 1,
          totalPages: Math.ceil((prev.total - 1) / pageSize),
          hasNext: prev.page < Math.ceil((prev.total - 1) / pageSize),
        }));
      }
    }

    return success;
  };

  return {
    items,
    pagination,
    isLoading,
    loadItems,
    addItem,
    updateItem,
    deleteItem,
    changePage,
  };
};
