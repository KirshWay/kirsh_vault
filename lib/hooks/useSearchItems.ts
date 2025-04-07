'use client';

import { useMemo, useState } from 'react';

import { CollectionItem } from '@/lib/db';

export type SearchOptions = {
  searchFields?: Array<keyof CollectionItem>;
  minScore?: number;
  limitResults?: number;
};

export const useSearchItems = (items: CollectionItem[], options: SearchOptions = {}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { searchFields = ['name', 'description'], minScore = 0.3, limitResults = 50 } = options;

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }

    const query = searchQuery.toLowerCase().trim();
    const searchTerms = query.split(/\s+/);

    return items
      .map((item) => {
        let score = 0;
        const maxPossibleScore = searchFields.length * searchTerms.length;

        searchFields.forEach((field) => {
          const value = String(item[field] || '').toLowerCase();

          searchTerms.forEach((term) => {
            if (field === 'name' && value === term) {
              score += 2;
            } else if (value.includes(` ${term}`) || value.startsWith(term)) {
              score += 1.5;
            } else if (value.includes(term)) {
              score += 1;
            }
          });
        });

        const normalizedScore = maxPossibleScore > 0 ? score / maxPossibleScore : 0;

        return {
          item,
          score: normalizedScore,
        };
      })
      .filter((result) => result.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limitResults)
      .map((result) => result.item);
  }, [items, searchQuery, searchFields, minScore, limitResults]);

  return {
    searchQuery,
    setSearchQuery,
    filteredItems,
    isSearching: searchQuery.trim().length > 0,
    resultsCount: filteredItems.length,
    totalCount: items.length,
  };
};
