import { describe, expect, test } from 'vitest';

import fixture from './fixtures/v1.json';
import { parseManifest } from './format';

describe('Backup format v1', () => {
  test('reads the published fixture without normalizing text, ratings or optional fields', () => {
    const result = parseManifest(fixture);
    expect(result.items[0]).toEqual({
      id: 7,
      name: '  A book  ',
      description: 'First line\nSecond line  ',
      category: 'book',
      rating: 7.5,
      createdAt: '2024-01-02T03:04:05.006Z',
      images: ['images/7/0.png'],
    });
    expect(result.items[1]).toEqual({
      id: 12,
      name: 'An item',
      category: 'other',
      createdAt: '2024-01-02T03:04:05.006Z',
    });
  });

  test('accepts an empty collection', () => {
    expect(parseManifest({ ...fixture, items: [] }).items).toEqual([]);
  });

  test('explains an unsupported format version', () => {
    expect(() => parseManifest({ ...fixture, formatVersion: 2 })).toThrow(/version/i);
  });

  test.each([
    { id: 1.5 },
    { name: '  ' },
    { rating: 11 },
    { rating: null },
    { category: 'unknown' },
    { createdAt: '2024-02-31T00:00:00.000Z' },
    { images: ['https://example.com/image.png'] },
    { images: ['images/../0.png'] },
    { images: ['images/7/0.svg'] },
    { images: ['images/7/1.png'] },
    { images: Array.from({ length: 6 }, (_, i) => `images/7/${i}.png`) },
    { unexpected: true },
  ])('rejects invalid record fields: %j', (changes) => {
    expect(() =>
      parseManifest({ ...fixture, items: [{ ...fixture.items[0], ...changes }] })
    ).toThrow(/record|item|backup/i);
  });

  test('rejects duplicate record identities', () => {
    expect(() =>
      parseManifest({ ...fixture, items: [fixture.items[0], fixture.items[0]] })
    ).toThrow(/duplicate/i);
  });

  test('rejects a collection exceeding the record budget', () => {
    const items = Array.from({ length: 10_001 }, (_, i) => ({
      id: i + 1,
      name: 'Item',
      category: 'other',
      createdAt: '2024-01-01T00:00:00.000Z',
    }));
    expect(() => parseManifest({ ...fixture, items })).toThrow(/limit|many/i);
  });
});
