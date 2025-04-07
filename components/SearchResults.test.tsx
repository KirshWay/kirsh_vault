import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { CollectionItem } from '@/lib/db';

import { SearchResults } from './SearchResults';

vi.mock('./CollectionItem', () => ({
  CollectionItemComponent: ({ item }: { item: CollectionItem }) => (
    <div data-testid={`item-${item.id}`}>{item.name}</div>
  ),
}));

describe('SearchResults component', () => {
  let testItems: CollectionItem[];
  let mockHandlers: {
    onItemDelete: ReturnType<typeof vi.fn>;
    onItemEdit: ReturnType<typeof vi.fn>;
    onItemExpand: ReturnType<typeof vi.fn>;
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

    expect(screen.getByText('War and Peace')).toBeDefined();
    expect(screen.getByText('Interstellar')).toBeDefined();
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

  test('should pass correct props to CollectionItemComponent', () => {
    const { container } = render(
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

    expect(screen.getByTestId('item-1')).toBeDefined();
    expect(screen.getByTestId('item-2')).toBeDefined();
  });

  test('should render animation container', () => {
    const { container } = render(
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

    expect(container.querySelector('.grid')).toBeDefined();
  });
});
