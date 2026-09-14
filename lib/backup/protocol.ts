import type { CollectionState } from '@/lib/db';

import type { BackupDownload, BackupProgress, RestorePreview } from './archive';

export type BackupCommand =
  | { type: 'export'; operationId: string }
  | { type: 'prepare'; operationId: string; file: File }
  | { type: 'export-current' }
  | { type: 'commit'; revision: number }
  | { type: 'cancel' };

export type BackupEvent =
  | { type: 'progress'; progress: BackupProgress }
  | { type: 'download'; download: BackupDownload }
  | { type: 'preview'; preview: RestorePreview }
  | { type: 'changed'; current: CollectionState }
  | { type: 'committed' }
  | { type: 'error'; message: string; recoverable: boolean }
  | { type: 'finished' };
