import { useEffect, useState } from 'react';

import { useDb } from '@/lib/context/DbContext';
import { CollectionItem, PaginationResult } from '@/lib/db';
import { FormValues } from '@/types';

export const DEFAULT_PAGE_SIZE = 12;

export const useCollectionItems = (initialPage = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const db = useDb();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
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
      const result = await db.getItemsPage(page, pageSize);
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
  }, [initialPage, pageSize]);

  const changePage = async (newPage: number) => {
    if (newPage === pagination.page) return;
    await loadItems(newPage);
  };

  const addItem = async (data: FormValues) => {
    const newItem = await db.addItem(data);

    if (typeof newItem === 'number') {
      const addedItem = await db.getItem(newItem);

      if (addedItem && pagination.page === 1) {
        setItems((prevItems) => [addedItem, ...prevItems].slice(0, pageSize));
      } else {
        await loadItems(pagination.page);
      }
    } else if (newItem !== false) {
      await loadItems(pagination.page);
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

  const toggleExpandItem = (id: number) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  return {
    items,
    pagination,
    isLoading,
    expandedItemId,
    addItem,
    updateItem,
    deleteItem,
    toggleExpandItem,
    changePage,
    loadItems,
  };
};
