import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { ImageViewer } from './image-viewer';

const images = ['/first.png', '/second.png'];

test('keyboard navigation wraps through images', () => {
  render(<ImageViewer images={images} open onOpenChange={vi.fn()} />);

  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(screen.getByAltText('Image 2')).toHaveAttribute('src', '/second.png');
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(screen.getByAltText('Image 1')).toHaveAttribute('src', '/first.png');
});

test('Escape uses the current close handler after a parent rerender', () => {
  const previousHandler = vi.fn();
  const currentHandler = vi.fn();
  const { rerender } = render(<ImageViewer images={images} open onOpenChange={previousHandler} />);

  rerender(<ImageViewer images={images} open onOpenChange={currentHandler} />);
  fireEvent.keyDown(window, { key: 'Escape' });

  expect(currentHandler).toHaveBeenCalledWith(false);
  expect(previousHandler).not.toHaveBeenCalled();
});

test('reopening and changing the initial image reset navigation', () => {
  const onOpenChange = vi.fn();
  const { rerender } = render(<ImageViewer images={images} open onOpenChange={onOpenChange} />);

  fireEvent.keyDown(window, { key: 'ArrowRight' });
  expect(screen.getByAltText('Image 2')).toHaveAttribute('src', '/second.png');
  rerender(<ImageViewer images={images} open={false} onOpenChange={onOpenChange} />);
  rerender(<ImageViewer images={images} open onOpenChange={onOpenChange} />);
  expect(screen.getByAltText('Image 1')).toHaveAttribute('src', '/first.png');

  rerender(<ImageViewer images={images} open initialIndex={1} onOpenChange={onOpenChange} />);
  expect(screen.getByAltText('Image 2')).toHaveAttribute('src', '/second.png');
});

test('adding images after a removal preserves the corrected selection', () => {
  const onOpenChange = vi.fn();
  const { rerender } = render(<ImageViewer images={images} open onOpenChange={onOpenChange} />);
  fireEvent.keyDown(window, { key: 'ArrowRight' });
  rerender(<ImageViewer images={['/first.png']} open onOpenChange={onOpenChange} />);
  rerender(<ImageViewer images={images} open onOpenChange={onOpenChange} />);
  expect(screen.getByAltText('Image 1')).toHaveAttribute('src', '/first.png');
  fireEvent.keyDown(window, { key: 'ArrowLeft' });
  expect(screen.getByAltText('Image 2')).toHaveAttribute('src', '/second.png');
});
