import { expect, test } from 'vitest';

import type { CollectionItem } from './db';
import { filterItems, type ItemFilters } from './search';

const items: CollectionItem[] = [
  {
    id: 1,
    name: 'War and Peace',
    description: "Tolstoy's epic novel",
    category: 'book',
    rating: 9,
    createdAt: new Date(0),
  },
  {
    id: 2,
    name: 'Interstellar',
    description: 'Space sci-fi movie',
    category: 'movie',
    rating: 8,
    createdAt: new Date(1),
  },
  {
    id: 3,
    name: 'Notes',
    description: 'Personal notes',
    category: 'other',
    createdAt: new Date(2),
  },
];

test.each<{ filters: ItemFilters; ids: number[] }>([
  { filters: {}, ids: [1, 2, 3] },
  { filters: { searchQuery: '  SPACE  ' }, ids: [2] },
  { filters: { category: 'movie' }, ids: [2] },
  { filters: { ratingFilter: { type: 'min', minValue: 9 } }, ids: [1, 3] },
  { filters: { ratingFilter: { type: 'max', maxValue: 8 } }, ids: [2, 3] },
  { filters: { ratingFilter: { type: 'exact', exactValue: 9 } }, ids: [1, 3] },
  { filters: { ratingFilter: { type: 'range', minValue: 7, maxValue: 8 } }, ids: [2, 3] },
  { filters: { ratingFilter: { type: 'preset', presetName: 'high' } }, ids: [1, 2, 3] },
  { filters: { searchQuery: 'tol', ratingFilter: { type: 'min', minValue: 9 } }, ids: [1] },
  { filters: { category: 'movie', ratingFilter: { type: 'min', minValue: 7 } }, ids: [2] },
  { filters: { category: 'other', ratingFilter: { type: 'min', minValue: 10 } }, ids: [3] },
])(
  'filters the whole input without changing its order or contents: $filters',
  ({ filters, ids }) => {
    const original = structuredClone(items);
    expect(filterItems(items, filters).map((item) => item.id)).toEqual(ids);
    expect(items).toEqual(original);
  }
);

test('ranks an exact title before description matches and retains order for ties', () => {
  const candidates = [
    { ...items[0], id: 1, name: 'Another title', description: 'Notes here' },
    { ...items[0], id: 2, name: 'Notes', description: '' },
    { ...items[0], id: 3, name: 'A third title', description: 'Notes here' },
  ];
  expect(filterItems(candidates, { searchQuery: 'Notes' }).map((item) => item.id)).toEqual([
    2, 1, 3,
  ]);
});

test('a zero rating remains distinct from a missing rating', () => {
  const candidates = [
    { id: 1, name: 'Zero', category: 'book' as const, rating: 0, createdAt: new Date(0) },
    { id: 2, name: 'Missing', category: 'book' as const, createdAt: new Date(0) },
  ];
  expect(filterItems(candidates, { ratingFilter: { type: 'exact', exactValue: 0 } })).toEqual([
    candidates[0],
  ]);
  expect(filterItems(candidates, { ratingFilter: { type: 'max', maxValue: 0 } })).toEqual([
    candidates[0],
  ]);
  expect(
    filterItems(candidates, { ratingFilter: { type: 'range', minValue: 0, maxValue: 0 } })
  ).toEqual([candidates[0]]);
});

test('full-collection search does not silently discard matches after fifty items', () => {
  const candidates = Array.from({ length: 75 }, (_, index) => ({
    ...items[0],
    id: index + 1,
    name: `Matching book ${index}`,
  }));
  expect(filterItems(candidates, { searchQuery: 'Matching' })).toHaveLength(75);
});
