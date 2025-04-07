'use client';

import { useMemo, useState } from 'react';

import { CollectionItem } from '@/lib/db';

export type RatingFilter = {
  type: 'min' | 'max' | 'exact' | 'range' | 'preset';
  minValue?: number;
  maxValue?: number;
  exactValue?: number;
  presetName?: 'high' | 'medium' | 'low';
};

export type SearchOptions = {
  searchFields?: Array<keyof CollectionItem>;
  minScore?: number;
  limitResults?: number;
};

export function useSearchItems(items: CollectionItem[], options: SearchOptions = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter | null>(null);

  const { searchFields = ['name', 'description'], minScore = 0.3, limitResults = 50 } = options;

  const filteredItems = useMemo(() => {
    let results = [...items];

    if (ratingFilter) {
      results = results.filter((item) => {
        if (item.category === 'other') return true;

        if (item.rating === undefined) return false;

        switch (ratingFilter.type) {
          case 'min':
            return item.rating >= (ratingFilter.minValue || 0);
          case 'max':
            return item.rating <= (ratingFilter.maxValue || 10);
          case 'exact':
            return item.rating === ratingFilter.exactValue;
          case 'range':
            return (
              item.rating >= (ratingFilter.minValue || 0) &&
              item.rating <= (ratingFilter.maxValue || 10)
            );
          case 'preset':
            switch (ratingFilter.presetName) {
              case 'high':
                return item.rating >= 7;
              case 'medium':
                return item.rating >= 4 && item.rating <= 6;
              case 'low':
                return item.rating >= 1 && item.rating <= 3;
              default:
                return true;
            }
          default:
            return true;
        }
      });
    }

    if (!searchQuery.trim()) {
      return results;
    }

    const query = searchQuery.toLowerCase().trim();
    const searchTerms = query.split(/\s+/);

    return results
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
  }, [items, searchQuery, ratingFilter, searchFields, minScore, limitResults]);

  return {
    searchQuery,
    setSearchQuery,
    ratingFilter,
    setRatingFilter,
    filteredItems,
    isSearching: searchQuery.trim().length > 0,
    isFiltering: ratingFilter !== null,
    resultsCount: filteredItems.length,
    totalCount: items.length,
  };
}
