import 'fake-indexeddb/auto';

import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { db } from '@/lib/db';

import { cleanupAbandonedBackups } from './session';

beforeEach(async () => {
  await db.delete();
  await db.open();
  await db.stagedItems.put({
    operationId: 'old',
    id: 1,
    item: { id: 1, name: 'Staged', category: 'other', createdAt: new Date() },
  });
  await db.restoreSessions.put({ id: 'old', itemCount: 1 });
});
afterEach(() => {
  db.close();
  vi.unstubAllGlobals();
});

test.each([true, false])(
  'cleanup respects an active operation in another tab: %s',
  async (busy) => {
    vi.stubGlobal('navigator', {
      locks: {
        request: async (
          _name: string,
          _options: unknown,
          run: (lock: object | null) => Promise<void>
        ) => run(busy ? null : {}),
      },
    });
    await cleanupAbandonedBackups(db);
    expect(await db.stagedItems.count()).toBe(busy ? 1 : 0);
    expect(await db.restoreSessions.count()).toBe(busy ? 1 : 0);
  }
);
