import type { CollectionItem, ItemCategory } from './db';

export type RatingFilter =
  | { type: 'min'; minValue: number }
  | { type: 'max'; maxValue: number }
  | { type: 'exact'; exactValue: number }
  | { type: 'range'; minValue: number; maxValue: number }
  | { type: 'preset'; presetName: 'high' | 'medium' | 'low' };

export type CategoryFilterType = ItemCategory | null;

export type SearchOptions = {
  searchFields?: Array<keyof Omit<CollectionItem, 'images'>>;
  minScore?: number;
  limitResults?: number;
};

export type ItemFilters = {
  category?: CategoryFilterType;
  searchQuery?: string;
  ratingFilter?: RatingFilter | null;
};

export function filterItems<T extends Omit<CollectionItem, 'images'>>(
  items: T[],
  filters: ItemFilters = {},
  options: SearchOptions = {}
) {
  const { category: categoryFilter, searchQuery = '', ratingFilter } = filters;
  const {
    searchFields = ['name', 'description'],
    minScore = 0.3,
    limitResults = Infinity,
  } = options;
  let results = [...items];

  if (categoryFilter) {
    results = results.filter((item) => item.category === categoryFilter);
  }

  if (ratingFilter) {
    results = results.filter((item) => {
      if (item.category === 'other') return true;

      if (item.rating === undefined) return false;

      switch (ratingFilter.type) {
        case 'min':
          return item.rating >= ratingFilter.minValue;
        case 'max':
          return item.rating <= ratingFilter.maxValue;
        case 'exact':
          return item.rating === ratingFilter.exactValue;
        case 'range':
          return item.rating >= ratingFilter.minValue && item.rating <= ratingFilter.maxValue;
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
        const value = String(item[field] ?? '').toLowerCase();

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
}
