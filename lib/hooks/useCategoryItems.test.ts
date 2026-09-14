import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { DbProvider } from '@/lib/context/DbContext';
import { db } from '@/lib/db';
import { seedCollection } from '@/tests/helpers/collection';

import { useCategoryItems } from './useCategoryItems';

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(DbProvider, null, children);
beforeEach(async () => {
  await db.delete();
  await db.open();
  await seedCollection(db, [
    { id: 1, name: 'First book', category: 'book', createdAt: new Date('2023-01-01') },
    { id: 2, name: 'Second book', category: 'book', createdAt: new Date('2023-01-02') },
    { id: 3, name: 'Movie', category: 'movie', createdAt: new Date('2023-01-03') },
  ]);
});
afterEach(() => db.close());

test('loads only its category in reverse chronological order', async () => {
  const { result } = renderHook(() => useCategoryItems('book'), { wrapper });
  await waitFor(() => expect(result.current.items.map((item) => item.id)).toEqual([2, 1]));
  expect(result.current.pagination.total).toBe(2);
});

test('adding and editing records updates the observable query', async () => {
  const { result } = renderHook(() => useCategoryItems('book'), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => {
    expect(await result.current.addItem({ name: 'New book', category: 'book' })).toBe(true);
  });
  await waitFor(() => expect(result.current.pagination.total).toBe(3));
  await act(async () => {
    expect(
      await result.current.updateItem(result.current.items.find((item) => item.id === 1)!, {
        name: 'Edited',
        category: 'book',
      })
    ).toBe(true);
  });
  await waitFor(() =>
    expect(result.current.items.find((item) => item.id === 1)?.name).toBe('Edited')
  );
});

test('deleting the final item on a page returns to the preceding page', async () => {
  const { result } = renderHook(() => useCategoryItems('book', 1, 1), { wrapper });
  await waitFor(() => expect(result.current.items[0]?.id).toBe(2));
  act(() => result.current.changePage(2));
  await waitFor(() => expect(result.current.items[0]?.id).toBe(1));
  await act(async () => {
    await result.current.deleteItem(result.current.items[0]);
  });
  await waitFor(() => expect(result.current.pagination.page).toBe(1));
  expect(result.current.items[0]?.id).toBe(2);
});

test('external database writes refresh an already mounted collection', async () => {
  const { result } = renderHook(() => useCategoryItems('book'), { wrapper });
  await waitFor(() => expect(result.current.items).toHaveLength(2));
  await act(async () => {
    await db.addItem(
      { name: 'External write', category: 'book' },
      (await db.getCollectionState()).generation
    );
  });
  await waitFor(() => expect(result.current.items[0]?.name).toBe('External write'));
});

test('adding after a last-page deletion keeps the user on the clamped page', async () => {
  const { result } = renderHook(() => useCategoryItems('book', 2, 1), { wrapper });
  await waitFor(() => expect(result.current.pagination.page).toBe(2));
  await act(async () => {
    await result.current.deleteItem(result.current.items[0]);
  });
  await waitFor(() => expect(result.current.pagination.page).toBe(1));
  await act(async () => {
    await result.current.addItem({ name: 'Newest', category: 'book' });
  });
  await waitFor(() => expect(result.current.pagination.total).toBe(2));
  expect(result.current.pagination.page).toBe(1);
  expect(result.current.items[0]?.name).toBe('Newest');
});
