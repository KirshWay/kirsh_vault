import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { CollectionItem } from '@/lib/db';

import { SearchResults } from './SearchResults';

describe('SearchResults component', () => {
  let testItems: CollectionItem[];
  let mockHandlers: {
    onItemDelete: ReturnType<typeof vi.fn<(id: number) => void>>;
    onItemEdit: ReturnType<typeof vi.fn<(item: CollectionItem) => void>>;
    onItemExpand: ReturnType<typeof vi.fn<(id: number) => void>>;
  };

  beforeEach(() => {
    testItems = [
      {
        id: 1,
        name: 'War and Peace',
        category: 'book',
        rating: 9,
        createdAt: new Date(),
      },
      {
        id: 2,
        name: 'Interstellar',
        category: 'movie',
        rating: 8,
        createdAt: new Date(),
      },
    ];

    mockHandlers = {
      onItemDelete: vi.fn(),
      onItemEdit: vi.fn(),
      onItemExpand: vi.fn(),
    };
  });

  test('should render items correctly', () => {
    render(
      <SearchResults
        items={testItems}
        isSearching={false}
        searchQuery=""
        resultsCount={2}
        totalCount={2}
        onItemDelete={mockHandlers.onItemDelete}
        onItemEdit={mockHandlers.onItemEdit}
        onItemExpand={mockHandlers.onItemExpand}
        expandedItemId={null}
      />
    );

    expect(screen.getByText('War and Peace')).toBeInTheDocument();
    expect(screen.getByText('Interstellar')).toBeInTheDocument();
  });

  test('should display search results count when searching', () => {
    render(
      <SearchResults
        items={testItems.slice(0, 1)}
        isSearching={true}
        searchQuery="War"
        resultsCount={1}
        totalCount={2}
        onItemDelete={mockHandlers.onItemDelete}
        onItemEdit={mockHandlers.onItemEdit}
        onItemExpand={mockHandlers.onItemExpand}
        expandedItemId={null}
      />
    );

    const resultText = screen.getByText((content, element) => {
      return element?.textContent === 'Found: 1 of 2';
    });
    expect(resultText).toBeInTheDocument();
  });

  test('should show empty state when no results found', () => {
    render(
      <SearchResults
        items={[]}
        isSearching={true}
        searchQuery="Not found query"
        resultsCount={0}
        totalCount={2}
        onItemDelete={mockHandlers.onItemDelete}
        onItemEdit={mockHandlers.onItemEdit}
        onItemExpand={mockHandlers.onItemExpand}
        expandedItemId={null}
      />
    );

    expect(screen.getByText('Nothing found for "Not found query"')).toBeInTheDocument();
  });

  test('routes edit, delete and expand actions to the corresponding record', async () => {
    const user = userEvent.setup();
    render(
      <SearchResults
        items={testItems}
        isSearching={false}
        searchQuery=""
        resultsCount={2}
        totalCount={2}
        onItemDelete={mockHandlers.onItemDelete}
        onItemEdit={mockHandlers.onItemEdit}
        onItemExpand={mockHandlers.onItemExpand}
        expandedItemId={1}
      />
    );

    expect(screen.getByRole('button', { name: 'Collapse War and Peace' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Expand Interstellar' })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[1]);
    expect(mockHandlers.onItemEdit).toHaveBeenCalledExactlyOnceWith(testItems[1]);
    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(mockHandlers.onItemDelete).toHaveBeenCalledExactlyOnceWith(1);
    await user.click(screen.getByRole('button', { name: 'Expand Interstellar' }));
    expect(mockHandlers.onItemExpand).toHaveBeenCalledExactlyOnceWith(2);
  });
});
