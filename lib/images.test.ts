import { afterEach, expect, test, vi } from 'vitest';

import { File, pngFile } from '@/tests/helpers/image';

import { optimizeImage } from './images';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test('rejects excessive declared dimensions before allocating a bitmap', async () => {
  const bytes = await pngFile().arrayBuffer();
  const header = new DataView(bytes);
  header.setUint32(16, 100_000);
  header.setUint32(20, 100_000);
  const decoder = vi.fn(async () => ({ width: 100_000, height: 100_000, close: vi.fn() }));
  vi.stubGlobal('createImageBitmap', decoder);
  await expect(
    optimizeImage(new File([new Uint8Array(bytes)], 'huge.png', { type: 'image/png' }))
  ).rejects.toThrow(/dimensions/i);
  expect(decoder).not.toHaveBeenCalled();
});

test('rejects oversized files before reading or decoding them', async () => {
  const file = new File([new Uint8Array(10 * 1024 ** 2 + 1)], 'large.png', { type: 'image/png' });
  const read = vi.spyOn(file, 'arrayBuffer');
  const decoder = vi.fn().mockRejectedValue(new Error('decoder was reached'));
  vi.stubGlobal('createImageBitmap', decoder);
  await expect(optimizeImage(file)).rejects.toThrow(/10 MB/);
  expect(read).not.toHaveBeenCalled();
  expect(decoder).not.toHaveBeenCalled();
});

test('rejects a declared MIME type that differs from the contents before decoding', async () => {
  const decoder = vi.fn().mockRejectedValue(new Error('decoder was reached'));
  vi.stubGlobal('createImageBitmap', decoder);
  const file = new File([new Uint8Array(await pngFile().arrayBuffer())], 'photo.webp', {
    type: 'image/webp',
  });
  await expect(optimizeImage(file)).rejects.toThrow(/type/);
  expect(decoder).not.toHaveBeenCalled();
});
