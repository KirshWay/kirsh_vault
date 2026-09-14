import { File as NodeFile } from 'node:buffer';
import { crc32, deflateSync } from 'node:zlib';

// jsdom's File lacks arrayBuffer(); Node supplies it but omits the browser-only path.
export class File extends NodeFile {
  readonly webkitRelativePath = '';
}

/** A real, decodable PNG, so upload tests exercise file validation as well as resizing. */
export function pngFile(width = 1, height = 1) {
  const chunk = (type: string, data: Buffer) => {
    const content = Buffer.concat([Buffer.from(type), data]);
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(content));
    return Buffer.concat([size, content, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const bytes = Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.alloc((width * 4 + 1) * height))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return new File([bytes], 'image.png', { type: 'image/png' });
}
