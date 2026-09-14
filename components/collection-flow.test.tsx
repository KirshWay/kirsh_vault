import 'fake-indexeddb/auto';

import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import Home from '@/app/page';
import { DbProvider } from '@/lib/context/DbContext';
import { db } from '@/lib/db';
import { useCategoryItems } from '@/lib/hooks/useCategoryItems';
import { useCollectionItems } from '@/lib/hooks/useCollectionItems';

import { ItemForm } from './ItemForm';
import { CategoryPage } from './templates/CategoryPage';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <DbProvider>{children}</DbProvider>
);

beforeEach(async () => {
  await db.delete();
  await db.open();
});

afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

async function seed(count: number) {
  await db.items.bulkAdd(
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: i === 0 ? 'Older hidden record' : `Book ${i + 1}`,
      category: 'book' as const,
      createdAt: new Date(2020, 0, i + 1),
    }))
  );
}

test('adding the thirteenth item updates pagination without a reload', async () => {
  await seed(12);
  const { result } = renderHook(() => useCollectionItems(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => {
    await result.current.addItem({ name: 'New item', category: 'book' });
  });
  await waitFor(() =>
    expect(result.current.pagination).toMatchObject({ total: 13, totalPages: 2, hasNext: true })
  );
});

test('search finds an item outside the first page', async () => {
  await seed(13);
  render(<Home />, { wrapper });
  await screen.findByRole('heading', { name: 'Book 13' });
  fireEvent.change(screen.getByPlaceholderText('Search in collection...'), {
    target: { value: 'Older hidden record' },
  });
  await screen.findByText('Found: 1 of 13');
  expect(screen.getByRole('heading', { name: 'Older hidden record' })).toBeInTheDocument();
});

test('editing an item can move it out of its current category', async () => {
  await seed(1);
  const { result } = renderHook(() => useCategoryItems('book'), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  await act(async () => {
    await result.current.updateItem(1, { name: 'Moved item', category: 'movie' });
  });
  expect((await db.getItem(1))?.category).toBe('movie');
  await waitFor(() => expect(result.current.items).toHaveLength(0));
});

test('failed updates preserve the open form and entered values', async () => {
  await seed(1);
  vi.spyOn(db, 'updateItem').mockRejectedValue(new Error('Storage quota exceeded'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<CategoryPage category="book" />, { wrapper });
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Unsaved edit' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Update Item' }));
  });
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByLabelText('Name')).toHaveValue('Unsaved edit');
  expect((await db.getItem(1))?.name).toBe('Older hidden record');
});

test('a pending save disables repeated submission until it settles', async () => {
  let finish!: (value: boolean) => void;
  const pending = new Promise<boolean>((resolve) => {
    finish = resolve;
  });
  const save = vi.fn(() => pending);
  render(
    <ItemForm
      defaultValues={{ name: 'Pending item', category: 'book' }}
      onSubmit={save}
      onCancel={() => {}}
    />
  );
  const submit = screen.getByRole('button', { name: 'Update Item' });
  await act(async () => {
    fireEvent.click(submit);
  });
  expect(submit).toBeDisabled();
  fireEvent.click(submit);
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(true);
  });
  expect(submit).toBeEnabled();
});

test('a failed initial read is shown as an error instead of an empty collection', async () => {
  vi.spyOn(db, 'getItemsPage').mockRejectedValue(new Error('IndexedDB unavailable'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  render(<Home />, { wrapper });
  expect(await screen.findByRole('alert')).toHaveTextContent(/load|storage|database/i);
  expect(screen.queryByText('Your collection is empty')).not.toBeInTheDocument();
});

test.each([
  { opener: 'Add Item', closeWith: 'Escape' },
  { opener: 'Edit', closeWith: 'Cancel' },
])('closing the form with $closeWith restores focus to $opener', async ({ opener, closeWith }) => {
  await seed(1);
  const user = userEvent.setup();
  render(<Home />, { wrapper });
  await screen.findByRole('heading', { name: 'Older hidden record' });
  const button = screen.getByRole('button', { name: opener });
  button.focus();
  await user.keyboard('{Enter}');
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  if (closeWith === 'Escape') await user.keyboard('{Escape}');
  else await user.click(screen.getByRole('button', { name: closeWith }));
  await waitFor(() => expect(button).toHaveFocus());
});

test('saving the first item restores focus to Add Item after the empty-state button disappears', async () => {
  const user = userEvent.setup();
  render(<Home />, { wrapper });
  await user.click(await screen.findByRole('button', { name: 'Add First Item' }));
  await user.type(screen.getByLabelText('Name'), 'First saved item');
  await user.click(screen.getByRole('button', { name: 'Add Item' }));
  await screen.findByRole('heading', { name: 'First saved item' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add Item' })).toHaveFocus());
});

test('an open gallery keeps a valid image when a live database update removes the selected image', async () => {
  await seed(1);
  await db.updateItem(1, { images: ['/first.png', '/second.png'] });
  const user = userEvent.setup();
  render(<Home />, { wrapper });
  await user.click(
    await screen.findByRole('button', { name: 'View images for Older hidden record' })
  );
  await user.click(screen.getByRole('button', { name: 'Next image' }));
  expect(screen.getByAltText('Image 2')).toHaveAttribute('src', '/second.png');
  await act(async () => {
    await db.updateItem(1, { images: ['/first.png'] });
  });
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument()
  );
  expect(screen.getByAltText('Image 1')).toHaveAttribute('src', '/first.png');
});
