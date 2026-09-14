import { ReactNode, RefObject, useEffect, useRef, useState } from 'react';

import { ItemForm } from '@/components/ItemForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DefaultValues, FormValues } from '@/types';

type Props = {
  stale?: boolean;
  conflict?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => Promise<boolean>;
  title: string;
  defaultValues?: DefaultValues | null;
  trigger?: ReactNode;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

export const ItemFormModal = ({
  stale = false,
  conflict,
  trigger,
  isOpen,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
  fallbackFocusRef,
}: Props) => {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (data: FormValues) => {
    if (saving) return;
    setSaving(true);
    try {
      const success = await onSubmit(data);
      if (success && mounted.current) {
        // The live query may remove the original button after the dialog closes.
        returnFocusRef.current = fallbackFocusRef?.current ?? returnFocusRef.current;
        onOpenChange(false);
      }
    } finally {
      if (mounted.current) setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!saving) onOpenChange(false);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!saving) onOpenChange(open);
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        closeDisabled={saving}
        onEscapeKeyDown={(event) => {
          if (saving) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (saving) event.preventDefault();
        }}
        className="flex max-h-[90dvh] flex-col overflow-hidden md:max-w-2xl md:p-0 max-md:max-h-[90dvh] max-md:overflow-hidden max-md:p-0"
        containerClassName="flex min-h-0 flex-col"
        onOpenAutoFocus={() => {
          returnFocusRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = returnFocusRef.current?.isConnected
            ? returnFocusRef.current
            : fallbackFocusRef?.current;
          target?.focus();
        }}
      >
        <DialogHeader className="shrink-0 px-4 pb-4 pt-5 pr-14 text-left sm:px-6 sm:pt-6 sm:pr-14">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Enter item details. Changes are saved in this browser.
          </DialogDescription>
        </DialogHeader>
        <ItemForm
          conflict={conflict}
          stale={stale}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
};
