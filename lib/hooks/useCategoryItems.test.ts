import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { CollectionItem } from '@/lib/db';
import { FormValues } from '@/types';

import { useCategoryItems } from './useCategoryItems';

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

    const filteredItems = mockBooks.filter((item) => item.id !== 1);
    expect(result.current.items.length).toBe(filteredItems.length);
  });
});
