import { z } from 'zod';

import { ITEM_CATEGORIES } from '@/lib/constants';
import { IMAGE_LIMITS } from '@/lib/image-policy';

export const BACKUP_LIMITS = {
  archiveBytes: 250 * 1024 ** 2,
  entryBytes: 10 * 1024 ** 2,
  items: 10_000,
  entries: 50_001,
} as const;

const isoDate = z.string().refine((value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
});

const backupItem = z
  .strictObject({
    id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    name: z.string().refine((name) => name.trim().length > 0),
    description: z.string().optional(),
    category: z.enum(ITEM_CATEGORIES),
    rating: z.number().min(0).max(10).optional(),
    createdAt: isoDate,
    images: z.array(z.string()).max(IMAGE_LIMITS.perItem).optional(),
  })
  .refine(
    (item) =>
      item.images?.every((path, index) =>
        new RegExp(`^images/${item.id}/${index}\\.(png|jpeg|webp)$`).test(path)
      ) ?? true
  );

const manifestSchema = z.strictObject({
  format: z.literal('kirsh-vault-backup'),
  formatVersion: z.literal(1),
  exportedAt: isoDate,
  items: z.array(backupItem).max(BACKUP_LIMITS.items),
});

export type BackupManifest = z.infer<typeof manifestSchema>;
export type BackupItem = BackupManifest['items'][number];

export function parseManifest(value: unknown): BackupManifest {
  if (value && typeof value === 'object' && 'formatVersion' in value && value.formatVersion !== 1) {
    throw new Error('This backup version is not supported. Update Kirsh Vault and try again.');
  }
  if (
    value &&
    typeof value === 'object' &&
    'items' in value &&
    Array.isArray(value.items) &&
    value.items.length > BACKUP_LIMITS.items
  ) {
    throw new Error('This backup exceeds the limit of 10,000 items.');
  }
  const result = manifestSchema.safeParse(value);
  if (!result.success) throw new Error('Invalid backup metadata or item record.');
  const ids = new Set<number>();
  for (const item of result.data.items) {
    if (ids.has(item.id)) throw new Error('The backup contains duplicate item IDs.');
    ids.add(item.id);
  }
  return result.data;
}
