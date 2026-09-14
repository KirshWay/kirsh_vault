import { IMAGE_LIMITS } from './image-policy';

type ImageInfo = {
  type: string;
  extension: 'png' | 'jpeg' | 'webp';
  width: number;
  height: number;
};

/** Read only container headers before asking the browser to allocate decoded pixels. */
export function inspectImage(bytes: Uint8Array): ImageInfo {
  if (bytes.length > IMAGE_LIMITS.fileBytes) throw new Error('Image exceeds the 10 MB limit.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));
  const info = (extension: ImageInfo['extension'], width: number, height: number): ImageInfo => {
    if (!width || !height || width * height > IMAGE_LIMITS.pixels) {
      throw new Error('Image dimensions exceed the 40 megapixel limit.');
    }
    return { type: `image/${extension}`, extension, width, height };
  };
  // PNG IHDR stores big-endian width and height: https://www.w3.org/TR/png-3/#11IHDR
  if (
    bytes.length >= 33 &&
    text(0, 8) === '\x89PNG\r\n\x1a\n' &&
    view.getUint32(8) === 13 &&
    text(12, 4) === 'IHDR'
  ) {
    return info('png', view.getUint32(16), view.getUint32(20));
  }
  // JPEG SOF frame headers: ITU-T T.81, B.2.2 (https://www.itu.int/rec/T-REC-T.81/en).
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker
        ) &&
        length >= 8
      ) {
        return info('jpeg', view.getUint16(offset + 5), view.getUint16(offset + 3));
      }
      offset += length;
    }
  }
  if (
    bytes.length >= 26 &&
    text(0, 4) === 'RIFF' &&
    text(8, 4) === 'WEBP' &&
    view.getUint32(4, true) + 8 === bytes.length
  ) {
    for (let offset = 12; offset + 8 <= bytes.length; ) {
      const kind = text(offset, 4);
      const length = view.getUint32(offset + 4, true);
      const data = offset + 8;
      if (data + length > bytes.length) break;
      // VP8X uses 24-bit dimensions minus one: https://developers.google.com/speed/webp/docs/riff_container#extended_file_format
      if (kind === 'VP8X' && length >= 10) {
        const uint24 = (position: number) =>
          bytes[position] + (bytes[position + 1] << 8) + (bytes[position + 2] << 16);
        return info('webp', uint24(data + 4) + 1, uint24(data + 7) + 1);
      }
      // VP8L packs two 14-bit dimensions minus one: https://developers.google.com/speed/webp/docs/webp_lossless_bitstream_specification#2_riff_header
      if (kind === 'VP8L' && length >= 5 && bytes[data] === 0x2f) {
        const bits = view.getUint32(data + 1, true);
        return info('webp', (bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
      }
      // VP8 dimensions occupy the low 14 bits: https://www.rfc-editor.org/rfc/rfc6386#section-9.1
      if (kind === 'VP8 ' && length >= 10 && text(data + 3, 3) === '\x9d\x01\x2a') {
        return info(
          'webp',
          view.getUint16(data + 6, true) & 0x3fff,
          view.getUint16(data + 8, true) & 0x3fff
        );
      }
      offset = data + length + (length % 2);
    }
  }
  throw new Error('Invalid or unsupported image. Use JPEG, PNG or WebP.');
}

export async function decodeImage(bytes: Uint8Array<ArrayBuffer>, expectedType: string) {
  const info = inspectImage(bytes);
  if (info.type !== expectedType) throw new Error('Image contents do not match its file type.');
  const bitmap = await createImageBitmap(new Blob([bytes], { type: info.type }));
  try {
    // EXIF orientation can exchange the width and height of legacy JPEG images.
    if (
      !(bitmap.width === info.width && bitmap.height === info.height) &&
      !(bitmap.width === info.height && bitmap.height === info.width)
    ) {
      throw new Error('Decoded image dimensions do not match its header.');
    }
  } catch (error) {
    bitmap.close();
    throw error;
  }
  return { bitmap, info };
}
