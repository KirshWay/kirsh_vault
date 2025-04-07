import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { CollectionItem } from '@/lib/db';

import { useSearchItems } from './useSearchItems';

describe('useSearchItems hook', () => {
  let testItems: CollectionItem[];

  beforeEach(() => {
    testItems = [
      {
        id: 1,
        name: 'War and Peace',
        description: "Tolstoy's epic novel",
        category: 'book',
        rating: 9,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: 'Interstellar',
        description: 'Space sci-fi movie',
        category: 'movie',
        rating: 8,
        createdAt: new Date(),
      },
      {
        id: 3,
        name: 'Notes',
        description: 'Personal notes',
        category: 'other',
        createdAt: new Date(),
      },
    ];
  });

  test('should return all items initially', () => {
    const { result } = renderHook(() => useSearchItems(testItems));

    expect(result.current.filteredItems.length).toBe(3);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.isFiltering).toBe(false);
  });

  test('should filter items by search query', () => {
    const { result } = renderHook(() => useSearchItems(testItems));

    act(() => {
      result.current.setSearchQuery('space');
    });

    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0].id).toBe(2);
    expect(result.current.isSearching).toBe(true);
  });

  test('should filter by name with higher priority', () => {
    const { result } = renderHook(() => useSearchItems(testItems));

    act(() => {
      result.current.setSearchQuery('war');
    });

    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0].id).toBe(1);
  });

  test('should filter items by rating', async () => {
    const { result } = renderHook(() => useSearchItems(testItems));

    act(() => {
      result.current.setRatingFilter({ type: 'min', minValue: 9 });
    });

    expect(result.current.isFiltering).toBe(true);

    expect(result.current.filteredItems.length).toBe(2);
    expect(result.current.filteredItems.some((item) => item.id === 1)).toBe(true);
    expect(result.current.filteredItems.some((item) => item.id === 3)).toBe(true);
    expect(result.current.filteredItems.some((item) => item.id === 2)).toBe(false);
  });

  test('should filter items by category', () => {
    const { result } = renderHook(() => useSearchItems(testItems));

    act(() => {
      result.current.setCategoryFilter('movie');
    });

    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0].id).toBe(2);
    expect(result.current.isFiltering).toBe(true);
  });

  test('should combine filters (search query and rating)', () => {
    const { result } = renderHook(() => useSearchItems(testItems));

    act(() => {
      result.current.setSearchQuery('tol');
      result.current.setRatingFilter({ type: 'min', minValue: 9 });
    });

    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0].id).toBe(1);
  });

  test('should combine filters (category and rating)', () => {
    const { result } = renderHook(() => useSearchItems(testItems));

    act(() => {
      result.current.setCategoryFilter('movie');
      result.current.setRatingFilter({ type: 'min', minValue: 7 });
    });

    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0].id).toBe(2);
  });

  test('should ignore rating filter for "other" category', () => {
    const { result } = renderHook(() => useSearchItems(testItems));

    act(() => {
      result.current.setCategoryFilter('other');
      result.current.setRatingFilter({ type: 'min', minValue: 5 });
    });

    expect(result.current.filteredItems.length).toBe(1);
    expect(result.current.filteredItems[0].id).toBe(3);
  });

  test('should reset filters correctly', () => {
    const { result } = renderHook(() => useSearchItems(testItems));

    act(() => {
      result.current.setSearchQuery('war');
      result.current.setRatingFilter({ type: 'min', minValue: 5 });
      result.current.setCategoryFilter('book');
    });

    act(() => {
      result.current.setSearchQuery('');
      result.current.setRatingFilter(null);
      result.current.setCategoryFilter(null);
    });

    expect(result.current.filteredItems.length).toBe(3);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.isFiltering).toBe(false);
  });
});
