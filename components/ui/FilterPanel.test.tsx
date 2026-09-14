import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { CategoryFilterType, RatingFilter } from '@/lib/search';

import { FilterPanel } from './FilterPanel';

describe('FilterPanel component', () => {
  let ratingFilterChangeMock: ReturnType<typeof vi.fn<(filter: RatingFilter | null) => void>>;
  let categoryFilterChangeMock: ReturnType<typeof vi.fn<(category: CategoryFilterType) => void>>;

  beforeEach(() => {
    ratingFilterChangeMock = vi.fn();
    categoryFilterChangeMock = vi.fn();
  });

  test('should not render when no filters are available', () => {
    const { container } = render(
      <FilterPanel
        category="other"
        ratingFilter={null}
        onRatingFilterChange={ratingFilterChangeMock}
        showCategoryFilter={false}
      />
    );

    expect(container.firstChild).toBe(null);
  });

  test('should render when rating filter is available', () => {
    render(
      <FilterPanel
        category="book"
        ratingFilter={null}
        onRatingFilterChange={ratingFilterChangeMock}
        showCategoryFilter={false}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  test('should render when category filter is available', () => {
    render(
      <FilterPanel
        category="other"
        ratingFilter={null}
        onRatingFilterChange={ratingFilterChangeMock}
        showCategoryFilter={true}
        categoryFilter={null}
        onCategoryFilterChange={categoryFilterChangeMock}
      />
    );

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  test('should display active rating filter', async () => {
    render(
      <FilterPanel
        category="book"
        ratingFilter={{ type: 'min', minValue: 7 }}
        onRatingFilterChange={ratingFilterChangeMock}
        showCategoryFilter={false}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();

    expect(screen.getByText('7+ stars')).toBeInTheDocument();
  });

  test('should display active category filter', async () => {
    render(
      <FilterPanel
        ratingFilter={null}
        onRatingFilterChange={ratingFilterChangeMock}
        showCategoryFilter={true}
        categoryFilter="book"
        onCategoryFilterChange={categoryFilterChangeMock}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();

    expect(screen.getByText('Book')).toBeInTheDocument();
  });

  test('should call onRatingFilterChange when rating filter is selected', async () => {
    const user = userEvent.setup();

    const mockRatingFilterChange = vi.fn();

    render(
      <FilterPanel
        category="book"
        ratingFilter={null}
        onRatingFilterChange={mockRatingFilterChange}
        showCategoryFilter={false}
      />
    );

    const filterButton = screen.getAllByText('Filters')[0];
    await user.click(filterButton);

    await user.click(screen.getByRole('menuitem', { name: 'Rating' }));
    await user.keyboard('{ArrowRight}{ArrowDown}{Enter}');

    expect(mockRatingFilterChange).toHaveBeenCalledWith({
      type: 'preset',
      presetName: 'high',
    });
  });

  test('should call onCategoryFilterChange when category filter is selected', async () => {
    const user = userEvent.setup();

    const mockCategoryFilterChange = vi.fn();

    render(
      <FilterPanel
        ratingFilter={null}
        onRatingFilterChange={ratingFilterChangeMock}
        showCategoryFilter={true}
        categoryFilter={null}
        onCategoryFilterChange={mockCategoryFilterChange}
      />
    );

    const filterButton = screen.getAllByText('Filters')[0];
    await user.click(filterButton);

    await user.click(screen.getByRole('menuitem', { name: 'Category' }));
    await user.keyboard('{ArrowRight}{ArrowDown}{Enter}');

    expect(mockCategoryFilterChange).toHaveBeenCalledWith('book');
  });

  test('should clear filters when clear button is clicked', async () => {
    const user = userEvent.setup();
    const mockRatingFilterChange = vi.fn();
    const mockCategoryFilterChange = vi.fn();

    render(
      <FilterPanel
        category="book"
        ratingFilter={{ type: 'min', minValue: 7 }}
        onRatingFilterChange={mockRatingFilterChange}
        showCategoryFilter={true}
        categoryFilter="book"
        onCategoryFilterChange={mockCategoryFilterChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /Filters/ }));
    await user.click(screen.getByRole('menuitem', { name: 'Clear all filters' }));
    expect(mockRatingFilterChange).toHaveBeenCalledWith(null);

    expect(mockCategoryFilterChange).toHaveBeenCalledWith(null);
  });

  test('updates the active filter count when the selected filters change', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <FilterPanel
        category="book"
        ratingFilter={null}
        onRatingFilterChange={ratingFilterChangeMock}
        showCategoryFilter={true}
        categoryFilter={null}
        onCategoryFilterChange={categoryFilterChangeMock}
      />
    );

    const filterButton = screen.getAllByText('Filters')[0];
    await user.click(filterButton);

    rerender(
      <FilterPanel
        category="book"
        ratingFilter={{ type: 'preset', presetName: 'high' }}
        onRatingFilterChange={ratingFilterChangeMock}
        showCategoryFilter={true}
        categoryFilter="book"
        onCategoryFilterChange={categoryFilterChangeMock}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
