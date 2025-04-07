import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { CollectionItem, PaginationResult } from '@/lib/db';
import { FormValues } from '@/types';

import { useCategoryItems } from './useCategoryItems';
import { DEFAULT_PAGE_SIZE } from './useCollectionItems';

vi.mock('@/lib/context/DbContext', () => ({
  useDb: () => ({
    getItemsByCategory: vi.fn().mockImplementation(async (category) => {
      if (category === 'book') {
        return mockBooks;
      } else if (category === 'movie') {
        return mockMovies;
      }
      return [];
    }),
    getItemsByCategoryPage: vi.fn().mockImplementation(async (category, page, limit) => {
      let items: CollectionItem[] = [];

      if (category === 'book') {
        items = mockBooks;
      } else if (category === 'movie') {
        items = mockMovies;
      }

      const total = items.length;
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, total);
      const pageItems = items.slice(startIndex, endIndex);

      const result: PaginationResult<CollectionItem> = {
        items: pageItems,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasNext: endIndex < total,
        hasPrev: page > 1,
      };

      return result;
    }),
    addItem: vi.fn().mockImplementation(async () => {
      return 999;
    }),
    updateItem: vi.fn().mockResolvedValue(true),
    deleteItem: vi.fn().mockResolvedValue(true),
    isLoading: false,
  }),
}));

let mockBooks: CollectionItem[];
let mockMovies: CollectionItem[];

describe('useCategoryItems hook', () => {
  beforeEach(() => {
    mockBooks = [
      {
        id: 1,
        name: 'War and Peace',
        description: "Tolstoy's epic novel",
        category: 'book',
        rating: 9,
        createdAt: new Date('2023-01-01'),
      },
      {
        id: 2,
        name: 'Master and Margarita',
        description: "Mikhail Bulgakov's novel",
        category: 'book',
        rating: 10,
        createdAt: new Date('2023-01-02'),
      },
    ];

    mockMovies = [
      {
        id: 3,
        name: 'Interstellar',
        description: 'Space sci-fi movie',
        category: 'movie',
        rating: 8,
        createdAt: new Date('2023-01-03'),
      },
    ];

    vi.clearAllMocks();
  });

  test('should load items of selected category on first rendering', async () => {
    const { result } = renderHook(() => useCategoryItems('book'));

    expect(result.current.items).toEqual([]);

    await act(async () => {
      await result.current.loadItems();
    });

    expect(result.current.items).toEqual(mockBooks);
    expect(result.current.pagination.total).toBe(mockBooks.length);
    expect(result.current.pagination.totalPages).toBe(
      Math.ceil(mockBooks.length / DEFAULT_PAGE_SIZE)
    );
    expect(result.current.isLoading).toBe(false);
  });

  test('should add a new item to the category', async () => {
    const { result } = renderHook(() => useCategoryItems('book'));

    const newItem: FormValues = {
      name: 'New Book',
      description: 'New book description',
      category: 'book',
    };

    let success;
    await act(async () => {
      success = await result.current.addItem(newItem);
    });

    expect(success).toBe(true);
  });

  test('should update an existing item', async () => {
    const { result } = renderHook(() => useCategoryItems('book'));

    const updates: FormValues = {
      name: 'Updated name',
      description: 'Updated description',
      category: 'book',
      rating: 10,
    };

    let success;
    await act(async () => {
      success = await result.current.updateItem(1, updates);
    });

    expect(success).toBe(true);
  });

  test('should delete an item and update the list', async () => {
    const { result } = renderHook(() => useCategoryItems('book'));

    await act(async () => {
      await result.current.loadItems();
    });

    let success;
    await act(async () => {
      success = await result.current.deleteItem(1);
    });

    expect(success).toBe(true);
  });

  test('should change page', async () => {
    const { result } = renderHook(() => useCategoryItems('book', 1, 1));

    await act(async () => {
      await result.current.loadItems();
    });

    expect(result.current.pagination.page).toBe(1);
    expect(result.current.items.length).toBe(1);

    await act(async () => {
      await result.current.changePage(2);
    });

    expect(result.current.pagination.page).toBe(2);
  });
});
