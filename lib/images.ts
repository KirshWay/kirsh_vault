import { IMAGE_ACCEPT, IMAGE_LIMITS } from './image-policy';
import { decodeImage } from './image-validation';

export const MAX_IMAGE_DIMENSION = 1600;
const MAX_STORED_LENGTH = 2 * 1024 * 1024;

/** Normalize orientation, strip metadata and bound stored dimensions and encoded size. */
export async function optimizeImage(file: File): Promise<string> {
  if (!Object.hasOwn(IMAGE_ACCEPT, file.type)) throw new Error('Unsupported image type');
  if (file.size > IMAGE_LIMITS.fileBytes) throw new Error('Image exceeds the 10 MB limit.');
  const { bitmap } = await decodeImage(new Uint8Array(await file.arrayBuffer()), file.type);
  try {
    const ratio = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL('image/webp', 0.82);
    if (!image.startsWith('data:image/') || image.length > MAX_STORED_LENGTH) {
      throw new Error('Image is too large after resizing');
    }
    return image;
  } finally {
    bitmap.close();
  }
}

/** Keep duplicate legacy images renderable with stable keys after reordering. */
export function imageEntries(images: string[]) {
  const occurrences = new Map<string, number>();
  return images.map((src) => {
    const occurrence = occurrences.get(src) ?? 0;
    occurrences.set(src, occurrence + 1);
    return { src, key: `${src}:${occurrence}` };
  });
}
