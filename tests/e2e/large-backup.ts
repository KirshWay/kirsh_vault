import { open } from 'node:fs/promises';
import { crc32, deflateSync } from 'node:zlib';

import { TextReader, Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js/index-native.js';

/** A deterministic, genuinely decodable noisy image; no zero padding or fake image payloads. */
function noisyPng() {
  const width = 750;
  const height = 500;
  const pixels = Buffer.alloc((width * 3 + 1) * height);
  let random = 0x12345678;
  for (let row = 0; row < height; row++) {
    for (let column = 1; column <= width * 3; column++) {
      random ^= random << 13;
      random ^= random >>> 17;
      random ^= random << 5;
      pixels[row * (width * 3 + 1) + column] = random & 255;
    }
  }
  function chunk(type: string, data: Buffer) {
    const tag = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(Buffer.concat([tag, data])));
    return Buffer.concat([length, tag, data, checksum]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export async function createLargeBackup(path: string) {
  const image = noisyPng();
  const count = Math.floor((249 * 1024 ** 2) / image.length);
  const file = await open(path, 'w');
  const stream = new WritableStream<Uint8Array>({
    async write(bytes) {
      await file.writeFile(bytes);
    },
    async close() {
      await file.close();
    },
    async abort() {
      await file.close();
    },
  });
  const writer = new ZipWriter(stream, { level: 0, useWebWorkers: false, zip64: false });
  const items = [];
  for (let index = 0; index < count; index++) {
    const id = index + 1;
    const imagePath = `images/${id}/0.png`;
    items.push({
      id,
      name: `Performance item ${id}`,
      category: 'other',
      createdAt: new Date(Date.UTC(2024, 0, 1) + index).toISOString(),
      images: [imagePath],
    });
    await writer.add(imagePath, new Uint8ArrayReader(image));
  }
  await writer.add(
    'collection.json',
    new TextReader(
      JSON.stringify({
        format: 'kirsh-vault-backup',
        formatVersion: 1,
        exportedAt: '2026-09-14T12:00:00.000Z',
        items,
      })
    )
  );
  await writer.close();
  return count;
}
