import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback, useState } from 'react';
import { toast } from 'react-hot-toast';

import { useDb } from '@/lib/context/DbContext';
import { CollectionItem, ItemCategory, ItemChangedError, StaleCollectionError } from '@/lib/db';
import { RatingFilter } from '@/lib/search';
import { FormValues } from '@/types';

export const DEFAULT_PAGE_SIZE = 12;

export function useCollectionItems(
  initialPage = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  category: ItemCategory | null = null
) {
  const db = useDb();
  const [page, setPage] = useState(initialPage);
  const [revision, setRevision] = useState(0);
  const [searchQuery, setQuery] = useState('');
  const [ratingFilter, setRating] = useState<RatingFilter | null>(null);
  const [categoryFilter, setCategory] = useState<ItemCategory | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [observedGeneration, setObservedGeneration] = useState<string | null>(null);
  const [mutationConflict, setMutationConflict] = useState<string | null>(null);
  const result = useLiveQuery(
    async () => {
      try {
        const data = await db.getItemsPage(page, pageSize, {
          category: category ?? categoryFilter,
          searchQuery,
          ratingFilter,
        });
        return { data, error: null };
      } catch {
        return {
          data: null,
          error: 'Unable to load your collection. Check browser storage and try again.',
        };
      }
    },
    [db, page, pageSize, category, categoryFilter, searchQuery, ratingFilter, revision],
    null
  );
  const generation = result?.data?.generation ?? '';
  if (generation && generation !== observedGeneration) {
    setObservedGeneration(generation);
    if (observedGeneration !== null) {
      setPage(1);
      setQuery('');
      setRating(null);
      setCategory(null);
      setExpandedItemId(null);
    }
  }

  const setSearchQuery = useCallback((query: string) => {
    setPage(1);
    setQuery(query);
  }, []);
  const setRatingFilter = useCallback((filter: RatingFilter | null) => {
    setPage(1);
    setRating(filter);
  }, []);
  const setCategoryFilter = useCallback((filter: ItemCategory | null) => {
    setPage(1);
    setCategory(filter);
  }, []);

  // Deleting a last-page item must also update the requested page for future writes.
  if (result?.data && page > Math.max(1, result.data.totalPages)) {
    setPage(result.data.page);
  }

  async function mutate(operation: () => Promise<unknown>, action: string) {
    try {
      await operation();
      toast.success(`Item ${action} successfully`);
      return true;
    } catch (error) {
      if (error instanceof StaleCollectionError || error instanceof ItemChangedError) {
        setMutationConflict(error.message);
        return false;
      }
      toast.error(`Item could not be ${action}. Your changes have not been saved.`);
      return false;
    }
  }

  return {
    mutationConflict,
    clearMutationConflict: () => setMutationConflict(null),
    generation,
    items: result?.data?.items ?? [],
    pagination: result?.data ?? {
      generation: '',
      total: 0,
      collectionTotal: 0,
      page: 1,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    isLoading: !result,
    error: result?.error ?? null,
    expandedItemId,
    searchQuery,
    setSearchQuery,
    ratingFilter,
    setRatingFilter,
    categoryFilter,
    setCategoryFilter,
    isSearching: !!searchQuery.trim(),
    isFiltering: !!ratingFilter || !!categoryFilter,
    addItem: (data: FormValues, expectedGeneration = generation) =>
      mutate(() => db.addItem(data, expectedGeneration), 'added'),
    updateItem: (item: CollectionItem, data: FormValues, expectedGeneration = generation) =>
      mutate(() => db.updateItem(item.id, data, expectedGeneration, item.revision ?? 0), 'updated'),
    deleteItem: (item: CollectionItem, expectedGeneration = generation) =>
      mutate(() => db.deleteItem(item.id, expectedGeneration, item.revision ?? 0), 'deleted'),
    toggleExpandItem: (id: number) => setExpandedItemId((current) => (current === id ? null : id)),
    changePage: setPage,
    loadItems: () => setRevision((current) => current + 1),
  };
}
