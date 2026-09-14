import { expect, test } from 'vitest';

import { CollectionItem } from './db';
import { filterItems } from './search';

const base: CollectionItem = { id: 1, name: 'Book', category: 'book', createdAt: new Date(0) };

test('zero is a valid rating and an absent rating does not match numeric filters', () => {
  const items = [
    { ...base, rating: 0 },
    { ...base, id: 2 },
    { ...base, id: 3, rating: 5 },
  ];
  expect(
    filterItems(items, { ratingFilter: { type: 'max', maxValue: 0 } }).map((item) => item.id)
  ).toEqual([1]);
  expect(
    filterItems(items, { ratingFilter: { type: 'range', minValue: 0, maxValue: 0 } }).map(
      (item) => item.id
    )
  ).toEqual([1]);
});

test('full-collection search does not silently discard matches after fifty items', () => {
  const items = Array.from({ length: 75 }, (_, id) => ({
    ...base,
    id,
    name: `Matching book ${id}`,
  }));
  expect(filterItems(items, { searchQuery: 'Matching' })).toHaveLength(75);
});

test('a name match ranks above a description-only match', () => {
  const items = [
    { ...base, description: 'Needle' },
    { ...base, id: 2, name: 'Needle' },
  ];
  expect(filterItems(items, { searchQuery: 'needle' }).map((item) => item.id)).toEqual([2, 1]);
});
