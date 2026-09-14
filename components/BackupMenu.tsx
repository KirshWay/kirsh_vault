'use client';

import { ChevronDown, Download, FileArchive, LoaderCircle, Upload } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BackupDownload, BackupProgress } from '@/lib/backup/archive';
import { CATEGORIES } from '@/lib/constants';
import { useBackup } from '@/lib/hooks/useBackup';

function fileSize(bytes: number) {
  return bytes < 1024 ** 2
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

function countLabel(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function saveFile(download: BackupDownload) {
  const url = URL.createObjectURL(download.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = download.filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Keep the URL alive while the browser takes ownership of the download.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function Progress({ progress, label }: { progress: BackupProgress | null; label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-3 text-sm">
      <LoaderCircle className="size-5 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
      <span>
        {label}
        {progress && progress.total > 0 && (
          <span className="mt-1 block text-muted-foreground tabular-nums">
            {progress.completed} of {progress.total} items
          </span>
        )}
      </span>
    </div>
  );
}

export function BackupMenu({ onRestored }: { onRestored: () => void }) {
  const backup = useBackup(onRestored);
  const { state } = backup;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const open = state.kind !== 'closed';
  const restoring = state.kind === 'preview' && state.busy === 'restore';
  const cannotClose = restoring || state.kind === 'cancelling';
  const restoreFlow =
    state.kind === 'choose' ||
    state.kind === 'preview' ||
    (state.kind === 'loading' && state.mode === 'restore');

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={triggerRef} variant="outline">
            <FileArchive />
            Data
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => {
            if (open) event.preventDefault();
          }}
        >
          <DropdownMenuItem onSelect={backup.exportBackup} className="gap-2 py-2.5">
            <Download className="size-4" />
            Download backup
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 py-2.5"
            onSelect={() => {
              backup.chooseFile();
              fileRef.current?.click();
            }}
          >
            <Upload className="size-4" />
            Restore from file
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileRef}
        type="file"
        accept=".zip,application/zip"
        aria-label="Backup file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) backup.prepare(file);
        }}
      />
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) backup.close();
        }}
      >
        <DialogContent
          closeDisabled={cannotClose}
          className="flex max-h-[90dvh] flex-col overflow-hidden md:p-0 max-md:max-h-[90dvh] max-md:overflow-hidden max-md:p-0"
          containerClassName="flex min-h-0 flex-col"
          onEscapeKeyDown={(event) => {
            if (cannotClose) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (cannotClose) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader className="shrink-0 px-5 pb-4 pt-6 pr-14 text-left">
            <DialogTitle>{restoreFlow ? 'Restore collection' : 'Collection backup'}</DialogTitle>
            <DialogDescription>
              {restoreFlow
                ? 'Restore your entire collection from a Kirsh Vault backup.'
                : 'Keep a copy of your entire collection, including images.'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5">
            {state.kind === 'choose' && (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose a ZIP backup up to 250 MB. The file is checked on your device before any
                  data is replaced.
                </p>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload />
                  Choose file
                </Button>
              </>
            )}
            {state.kind === 'loading' && (
              <Progress
                progress={state.progress}
                label={state.mode === 'restore' ? 'Checking backup…' : 'Preparing backup…'}
              />
            )}
            {state.kind === 'cancelling' && <Progress progress={null} label="Cancelling…" />}
            {state.kind === 'error' && (
              <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm">
                {state.message}
              </p>
            )}
            {state.kind === 'download' && (
              <>
                <p role="status" className="text-sm">
                  Your backup is ready ({fileSize(state.download.blob.size)}).
                </p>
                <p className="break-all text-sm text-muted-foreground">{state.download.filename}</p>
                <p className="text-sm text-muted-foreground">
                  This file contains your entries and photos. It is not encrypted. Keep it somewhere
                  safe.
                </p>
              </>
            )}
            {state.kind === 'preview' && (
              <>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(state.preview.exportedAt).toLocaleString()}
                  </p>
                  <p className="font-medium tabular-nums">
                    {countLabel(state.preview.itemCount, 'item')} ·{' '}
                    {countLabel(state.preview.imageCount, 'image')}
                  </p>
                </div>
                <dl className="grid grid-cols-3 gap-3 rounded-md bg-muted p-3 text-sm">
                  {(['book', 'movie', 'other'] as const).map((category) => (
                    <div key={category}>
                      <dt className="text-muted-foreground">{CATEGORIES[category]}</dt>
                      <dd className="mt-1 font-medium tabular-nums">
                        {state.preview.categories[category]}
                      </dd>
                    </div>
                  ))}
                </dl>
                {state.preview.samples.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Included items</p>
                    <ul className="space-y-2 text-sm">
                      {state.preview.samples.map((item) => (
                        <li key={item.id} className="truncate" title={item.name}>
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="rounded-md border border-destructive/30 p-3 text-sm">
                  {state.preview.current.count} current{' '}
                  {state.preview.current.count === 1 ? 'item' : 'items'} will be replaced with{' '}
                  {countLabel(state.preview.itemCount, 'item')} from this backup.
                  {state.preview.itemCount === 0 && (
                    <strong className="mt-1 block">This will delete all current items.</strong>
                  )}
                </p>
                {state.preview.storageWarning && (
                  <p className="text-sm text-muted-foreground">
                    Browser storage may be low. If there is not enough space, restoration will stop
                    without replacing your current collection.
                  </p>
                )}
                {state.message && (
                  <p role="alert" className="text-sm text-destructive">
                    {state.message}
                  </p>
                )}
                {state.busy ? (
                  <Progress
                    progress={state.progress}
                    label={restoring ? 'Replacing collection…' : 'Preparing current backup…'}
                  />
                ) : (
                  <div className="space-y-2">
                    {state.download && (
                      <p role="status" className="text-sm">
                        Current backup is ready ({fileSize(state.download.blob.size)}).
                      </p>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        if (state.download) saveFile(state.download);
                        else backup.exportCurrent();
                      }}
                    >
                      <Download />
                      {state.download ? 'Save current backup' : 'Download current backup'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Keep a copy of your current entries and photos before replacing them. Backup
                      files are not encrypted.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t px-5 py-4">
            <Button variant="outline" disabled={cannotClose} onClick={backup.close}>
              {state.kind === 'preview' || state.kind === 'loading' ? 'Cancel' : 'Close'}
            </Button>
            {state.kind === 'download' && (
              <Button onClick={() => saveFile(state.download)}>
                <Download />
                Save backup
              </Button>
            )}
            {state.kind === 'preview' && (
              <Button variant="destructive" disabled={!!state.busy} onClick={backup.restore}>
                {restoring ? 'Replacing…' : 'Replace collection'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
