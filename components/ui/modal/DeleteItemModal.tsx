import { RefObject, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CollectionItem } from '@/lib/db';

type Props = {
  item: CollectionItem | null;
  conflict: string | null;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
  fallbackFocusRef: RefObject<HTMLElement | null>;
};

export function DeleteItemModal({ item, conflict, onClose, onConfirm, fallbackFocusRef }: Props) {
  const [deleting, setDeleting] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  async function confirm() {
    if (deleting || conflict) return;
    setDeleting(true);
    try {
      if (await onConfirm()) {
        returnFocusRef.current = fallbackFocusRef.current;
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog
      open={!!item}
      onOpenChange={(open) => {
        if (!open && !deleting) onClose();
      }}
    >
      <DialogContent
        closeDisabled={deleting}
        className="flex max-h-[90dvh] flex-col"
        containerClassName="flex min-h-0 flex-col gap-4"
        onEscapeKeyDown={(event) => {
          if (deleting) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (deleting) event.preventDefault();
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          cancelRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = returnFocusRef.current?.isConnected
            ? returnFocusRef.current
            : fallbackFocusRef.current;
          target?.focus();
        }}
      >
        <DialogHeader className="shrink-0 pr-10 text-left">
          <DialogTitle>Delete item?</DialogTitle>
          <DialogDescription>
            This removes the item and its images from this browser. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
          <p className="break-words font-medium">{item?.name}</p>
          {conflict && (
            <p role="alert" className="mt-3 rounded-md border p-3 text-sm">
              {conflict}
            </p>
          )}
        </div>
        <div className="flex shrink-0 justify-end gap-2">
          <Button ref={cancelRef} variant="outline" onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={deleting || !!conflict}>
            {deleting ? 'Deleting…' : 'Delete item'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
