'use client';

import { useMemo, useState } from 'react';

import { CollectionItem } from '@/lib/db';
import { CategoryFilterType, filterItems, RatingFilter, SearchOptions } from '@/lib/search';

export type { CategoryFilterType, RatingFilter, SearchOptions } from '@/lib/search';

export function useSearchItems(items: CollectionItem[], options: SearchOptions = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>(null);
  const filteredItems = useMemo(
    () => filterItems(items, { searchQuery, ratingFilter, category: categoryFilter }, options),
    [items, searchQuery, ratingFilter, categoryFilter, options]
  );
  return {
    searchQuery,
    setSearchQuery,
    ratingFilter,
    setRatingFilter,
    categoryFilter,
    setCategoryFilter,
    filteredItems,
    isSearching: !!searchQuery.trim(),
    isFiltering: !!ratingFilter || !!categoryFilter,
    resultsCount: filteredItems.length,
    totalCount: items.length,
  };
}
