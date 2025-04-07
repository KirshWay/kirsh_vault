import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { CollectionItem } from '@/lib/db';

import { CollectionItemComponent } from './CollectionItem';

vi.mock('@/components/ui/image-viewer', () => ({
  ImageViewer: ({
    open,
    onOpenChange,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-testid="image-viewer">
      {open && <button onClick={() => onOpenChange(false)}>Close</button>}
    </div>
  ),
}));

describe('CollectionItemComponent', () => {
  const mockItem: CollectionItem = {
    id: 1,
    name: 'Test item',
    description: 'Test description',
    category: 'book',
    rating: 8,
    createdAt: new Date('2023-01-01'),
    images: ['image1.jpg', 'image2.jpg'],
  };

  const defaultProps = {
    item: mockItem,
    onDelete: vi.fn(),
    onEdit: vi.fn(),
    isExpanded: false,
    onExpand: vi.fn(),
  };

  test('should display correct item data', () => {
    render(<CollectionItemComponent {...defaultProps} />);

    expect(screen.getByText('Test item')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('1/1/2023')).toBeInTheDocument();
  });

  test('should display images if they exist', () => {
    render(<CollectionItemComponent {...defaultProps} />);

    const image = screen.getByAltText('Test item');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toBe('image1.jpg');

    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  test('should display indicator for items without images', () => {
    const itemWithoutImages = {
      ...mockItem,
      images: [],
    };

    render(<CollectionItemComponent {...defaultProps} item={itemWithoutImages} />);

    const placeholder = screen.getByTestId('image-icon');
    expect(placeholder).toBeInTheDocument();
  });

  test('should display rating for books and movies', () => {
    render(<CollectionItemComponent {...defaultProps} />);

    const ratingElement = screen.getByTestId('star-rating');
    expect(ratingElement).toBeInTheDocument();
  });

  test('should not display rating for the "other" category', () => {
    const otherItem = {
      ...mockItem,
      category: 'other' as const,
      rating: 5,
    };

    render(<CollectionItemComponent {...defaultProps} item={otherItem} />);

    const ratingElement = screen.queryByTestId('star-rating');
    expect(ratingElement).not.toBeInTheDocument();
  });

  test('should manage description visibility through expanded state', () => {
    const { rerender } = render(<CollectionItemComponent {...defaultProps} />);

    const contentCollapsed = screen.getByText('Test description').closest('div');
    expect(contentCollapsed).toHaveClass('max-h-0');

    rerender(<CollectionItemComponent {...defaultProps} isExpanded={true} />);

    const contentExpanded = screen.getByText('Test description').closest('div');
    expect(contentExpanded).toHaveClass('max-h-96');
  });

  test('should call onExpand when the expand button is clicked', () => {
    render(<CollectionItemComponent {...defaultProps} />);

    const expandButton = screen.getByRole('button', { name: '' });
    fireEvent.click(expandButton);

    expect(defaultProps.onExpand).toHaveBeenCalledTimes(1);
  });

  test('should call onEdit when the edit button is clicked', () => {
    render(<CollectionItemComponent {...defaultProps} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(defaultProps.onEdit).toHaveBeenCalledTimes(1);
  });

  test('should call onDelete when the delete button is clicked', () => {
    render(<CollectionItemComponent {...defaultProps} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
  });

  test('should open image viewer when an image is clicked', () => {
    render(<CollectionItemComponent {...defaultProps} />);

    const imageContainer = screen.getByAltText('Test item').parentElement;
    fireEvent.click(imageContainer!);

    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toBeInTheDocument();
  });
});
