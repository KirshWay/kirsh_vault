import { fireEvent, render, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { ImageViewer } from './image-viewer';

const images = ['/first.png', '/second.png'];

const currentImage = () => document.querySelector('[role="group"]:not([inert]) img');
const pressKey = (key: string) => fireEvent.keyDown(document.activeElement!, { key });

test('keyboard navigation wraps through images', async () => {
  render(<ImageViewer images={images} open onOpenChange={vi.fn()} />);

  pressKey('ArrowLeft');
  await waitFor(() => expect(currentImage()).toHaveAttribute('src', '/second.png'));
  pressKey('ArrowRight');
  await waitFor(() => expect(currentImage()).toHaveAttribute('src', '/first.png'));
});

test('Escape uses the current close handler after a parent rerender', async () => {
  const previousHandler = vi.fn();
  const currentHandler = vi.fn();
  const { rerender } = render(<ImageViewer images={images} open onOpenChange={previousHandler} />);

  rerender(<ImageViewer images={images} open onOpenChange={currentHandler} />);
  pressKey('Escape');

  await waitFor(() => expect(currentHandler).toHaveBeenCalledWith(false));
  expect(previousHandler).not.toHaveBeenCalled();
});

test('reopening and changing the initial image reset navigation', async () => {
  const onOpenChange = vi.fn();
  const { rerender } = render(<ImageViewer images={images} open onOpenChange={onOpenChange} />);

  pressKey('ArrowRight');
  await waitFor(() => expect(currentImage()).toHaveAttribute('src', '/second.png'));
  rerender(<ImageViewer images={images} open={false} onOpenChange={onOpenChange} />);
  rerender(<ImageViewer images={images} open onOpenChange={onOpenChange} />);
  await waitFor(() => expect(currentImage()).toHaveAttribute('src', '/first.png'));

  rerender(<ImageViewer images={images} open initialIndex={1} onOpenChange={onOpenChange} />);
  await waitFor(() => expect(currentImage()).toHaveAttribute('src', '/second.png'));
});

test('adding images after a removal preserves the corrected selection', async () => {
  const onOpenChange = vi.fn();
  const { rerender } = render(<ImageViewer images={images} open onOpenChange={onOpenChange} />);
  pressKey('ArrowRight');
  rerender(<ImageViewer images={['/first.png']} open onOpenChange={onOpenChange} />);
  rerender(<ImageViewer images={images} open onOpenChange={onOpenChange} />);
  await waitFor(() => expect(currentImage()).toHaveAttribute('src', '/first.png'));
  pressKey('ArrowLeft');
  await waitFor(() => expect(currentImage()).toHaveAttribute('src', '/second.png'));
});
