import 'fake-indexeddb/auto';

import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import Home from '@/app/page';
import { DbProvider } from '@/lib/context/DbContext';
import { db } from '@/lib/db';
import { useCategoryItems } from '@/lib/hooks/useCategoryItems';
import { useCollectionItems } from '@/lib/hooks/useCollectionItems';
import { seedCollection } from '@/tests/helpers/collection';

import { ItemForm } from './ItemForm';
import { CategoryPage } from './templates/CategoryPage';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

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
  await seedCollection(
    db,
    Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: i === 0 ? 'Older hidden record' : `Book ${i + 1}`,
      category: 'book' as const,
      createdAt: new Date(2020, 0, i + 1),
    }))
  );
}

test('restoration blocks an open edit form without discarding its draft', async () => {
  await seed(1);
  render(<Home />, { wrapper });
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Keep this draft' } });
  const state = await db.getCollectionState();
  const item = {
    id: 1,
    name: 'Restored record',
    category: 'other' as const,
    createdAt: new Date(),
  };
  await act(async () => {
    await db.stagedItems.put({ operationId: 'external', id: 1, item });
    await db.restoreSessions.put({ id: 'external', itemCount: 1 });
    await db.replaceFromStaging('external', state.revision);
  });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Update Item' })).toBeDisabled());
  expect(screen.getByLabelText('Name')).toHaveValue('Keep this draft');
  expect(screen.getByRole('alert')).toHaveTextContent(/restored/i);
  expect((await db.getItem(1))?.name).toBe('Restored record');
});

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
    await result.current.updateItem(result.current.items[0], {
      name: 'Moved item',
      category: 'movie',
    });
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
  expect(submit).toHaveAccessibleName('Saving…');
  fireEvent.click(submit);
  expect(save).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(true);
  });
  expect(submit).toBeEnabled();
  expect(submit).toHaveAccessibleName('Update Item');
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
  await db.updateItem(
    1,
    { images: ['/first.png', '/second.png'] },
    (await db.getCollectionState()).generation,
    0
  );
  const user = userEvent.setup();
  render(<Home />, { wrapper });
  await user.click(
    await screen.findByRole('button', { name: 'View images for Older hidden record' })
  );
  await user.click(await screen.findByRole('button', { name: 'Next image' }));
  await waitFor(() =>
    expect(document.querySelector('[role="group"]:not([inert]) img')).toHaveAttribute(
      'src',
      '/second.png'
    )
  );
  await act(async () => {
    await db.updateItem(
      1,
      { images: ['/first.png'] },
      (await db.getCollectionState()).generation,
      1
    );
  });
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument()
  );
  expect(document.querySelector('[role="group"]:not([inert]) img')).toHaveAttribute(
    'src',
    '/first.png'
  );
});

test('a conflicting edit preserves the draft and explains why saving is blocked', async () => {
  await seed(1);
  const user = userEvent.setup();
  render(<Home />, { wrapper });
  await user.click(await screen.findByRole('button', { name: 'Edit' }));
  await user.clear(screen.getByLabelText('Name'));
  await user.type(screen.getByLabelText('Name'), 'Keep my draft');
  await act(async () => {
    await db.updateItem(
      1,
      { description: 'Saved in another tab' },
      (await db.getCollectionState()).generation,
      0
    );
  });
  await user.click(screen.getByRole('button', { name: 'Update Item' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/changed/i);
  expect(screen.getByLabelText('Name')).toHaveValue('Keep my draft');
  expect(screen.getByRole('button', { name: 'Update Item' })).toBeDisabled();
  expect((await db.getItem(1))?.description).toBe('Saved in another tab');
});

test('deleting requires confirmation, supports cancellation and returns focus after success', async () => {
  await seed(1);
  const user = userEvent.setup();
  render(<Home />, { wrapper });
  const trigger = await screen.findByRole('button', { name: 'Delete' });
  await user.click(trigger);
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveTextContent('Older hidden record');
  expect(await db.items.count()).toBe(1);
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(await db.items.count()).toBe(1);
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Delete item' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(await db.items.count()).toBe(0);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add Item' })).toHaveFocus());
});

test.each(['edit', 'restore'] as const)(
  'an outdated deletion confirmation cannot remove an item after %s',
  async (change) => {
    await seed(1);
    const user = userEvent.setup();
    render(<Home />, { wrapper });
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await screen.findByRole('dialog');
    await act(async () => {
      if (change === 'restore')
        await seedCollection(db, [
          { id: 1, name: 'Restored item', category: 'book', createdAt: new Date() },
        ]);
      else
        await db.updateItem(
          1,
          { name: 'Newer edit' },
          (await db.getCollectionState()).generation,
          0
        );
    });
    await user.click(screen.getByRole('button', { name: 'Delete item' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/changed|restored/i);
    expect(await db.items.count()).toBe(1);
    expect(screen.getByRole('button', { name: 'Delete item' })).toBeDisabled();
  }
);

test('a pending deletion blocks dismissal and finishes only after the database write', async () => {
  await seed(1);
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const remove = db.deleteItem.bind(db);
  vi.spyOn(db, 'deleteItem').mockImplementation(async (...args) => {
    await pending;
    await remove(...args);
  });
  const user = userEvent.setup();
  render(<Home />, { wrapper });
  await user.click(await screen.findByRole('button', { name: 'Delete' }));
  await user.click(screen.getByRole('button', { name: 'Delete item' }));
  expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  await user.keyboard('{Escape}');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(await db.items.count()).toBe(1);
  await act(async () => {
    finish();
  });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(await db.items.count()).toBe(0);
});

test('a failed deletion preserves the record and lets the user retry', async () => {
  await seed(1);
  const user = userEvent.setup();
  const fail = () => {
    throw new Error('Storage write failed');
  };
  db.items.hook('deleting', fail);
  try {
    render(<Home />, { wrapper });
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Delete item' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete item' })).toBeEnabled());
    expect((await db.getItem(1))?.name).toBe('Older hidden record');
  } finally {
    db.items.hook('deleting').unsubscribe(fail);
  }
  await user.click(screen.getByRole('button', { name: 'Delete item' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(await db.items.count()).toBe(0);
});
