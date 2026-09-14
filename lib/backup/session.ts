import type { AppDatabase } from '@/lib/db';

export const BACKUP_LOCK = 'kirshVault:backup';

/** The caller must hold BACKUP_LOCK before clearing shared temporary storage. */
export async function clearBackupStaging(database: AppDatabase) {
  await database.transaction('rw', [database.stagedItems, database.restoreSessions], async () => {
    await database.stagedItems.clear();
    await database.restoreSessions.clear();
  });
}

export async function cleanupAbandonedBackups(database: AppDatabase) {
  if (!navigator.locks) return;
  await navigator.locks.request(BACKUP_LOCK, { ifAvailable: true }, async (lock) => {
    if (lock) await clearBackupStaging(database);
  });
}
