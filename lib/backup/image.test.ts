import { afterEach, expect, test, vi } from 'vitest';

import { inspectImage } from '@/lib/image-validation';

import { decodeStoredImage, validateImage } from './image';

const png = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGOQq4j6DwADmAHwUSyGuQAAAABJRU5ErkJggg==',
    'base64'
  )
);
afterEach(() => vi.unstubAllGlobals());

test('identifies actual PNG contents and dimensions', () => {
  expect(inspectImage(png)).toEqual({ type: 'image/png', extension: 'png', width: 1, height: 1 });
});

test.each([
  {
    bytes: [255, 216, 255, 192, 0, 17, 8, 0, 32, 0, 64, 3, 1, 17, 0, 2, 17, 0, 3, 17, 0],
    extension: 'jpeg',
  },
  {
    bytes: [
      82, 73, 70, 70, 18, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 76, 5, 0, 0, 0, 47, 63, 192, 7, 0, 0,
    ],
    extension: 'webp',
  },
  {
    bytes: [
      82, 73, 70, 70, 22, 0, 0, 0, 87, 69, 66, 80, 86, 80, 56, 88, 10, 0, 0, 0, 0, 0, 0, 0, 63, 0,
      0, 31, 0, 0,
    ],
    extension: 'webp',
  },
])('reads $extension dimensions before decoding', ({ bytes, extension }) => {
  expect(inspectImage(Uint8Array.from(bytes))).toMatchObject({ extension, width: 64, height: 32 });
});

test('rejects excessive pixel counts before invoking the browser decoder', async () => {
  const oversized = png.slice();
  const view = new DataView(oversized.buffer);
  view.setUint32(16, 100_000);
  view.setUint32(20, 100_000);
  const decoder = vi.fn();
  vi.stubGlobal('createImageBitmap', decoder);
  await expect(validateImage(oversized, 'image/png')).rejects.toThrow(/dimensions|large/i);
  expect(decoder).not.toHaveBeenCalled();
});

test('rejects a claimed type which differs from the file contents', async () => {
  await expect(validateImage(png, 'image/webp')).rejects.toThrow(/type|match/i);
});

test('rejects HTML and truncated images', () => {
  expect(() => inspectImage(new TextEncoder().encode('<svg/>'))).toThrow(/image/i);
  expect(() => inspectImage(png.slice(0, 20))).toThrow(/image/i);
});

test('stored images are decoded without fetching URLs or changing bytes', () => {
  const data = `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
  expect(decodeStoredImage(data).bytes).toEqual(png);
  expect(() => decodeStoredImage('https://example.com/photo.png')).toThrow(/embedded|image/i);
});

test('rejects content that the browser cannot decode', async () => {
  vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('Invalid image')));
  await expect(validateImage(png, 'image/png')).rejects.toThrow(/decode|image/i);
});

test('checks the decoded dimensions and releases the bitmap', async () => {
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', async () => ({ width: 2, height: 2, close }));
  await expect(validateImage(png, 'image/png')).rejects.toThrow(/dimensions/i);
  expect(close).toHaveBeenCalledOnce();
});
