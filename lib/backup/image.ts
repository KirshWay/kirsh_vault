import { IMAGE_LIMITS } from '@/lib/image-policy';
import { decodeImage } from '@/lib/image-validation';

export function decodeStoredImage(data: string) {
  if (typeof data !== 'string' || data.length > Math.ceil(IMAGE_LIMITS.fileBytes / 3) * 4 + 32) {
    throw new Error('Stored image exceeds the 10 MB limit.');
  }
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if (!match || match[2].length % 4 !== 0) {
    throw new Error('Only embedded JPEG, PNG and WebP images can be backed up.');
  }
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  return { bytes, type: match[1] };
}

export async function validateImage(bytes: Uint8Array<ArrayBuffer>, expectedType: string) {
  const { bitmap, info } = await decodeImage(bytes, expectedType);
  bitmap.close();
  return info;
}
