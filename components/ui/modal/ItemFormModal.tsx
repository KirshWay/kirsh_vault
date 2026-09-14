import { ReactNode, RefObject, useRef } from 'react';

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
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => Promise<boolean>;
  title: string;
  defaultValues?: DefaultValues | null;
  trigger?: ReactNode;
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

export const ItemFormModal = ({
  trigger,
  isOpen,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
  fallbackFocusRef,
}: Props) => {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const handleSubmit = async (data: FormValues) => {
    const success = await onSubmit(data);
    if (success) {
      // The live query may remove the original button after the dialog closes.
      returnFocusRef.current = fallbackFocusRef?.current ?? returnFocusRef.current;
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto overscroll-contain sm:max-w-[425px]"
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
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Enter item details. Changes are saved in this browser.
          </DialogDescription>
        </DialogHeader>
        <ItemForm defaultValues={defaultValues} onSubmit={handleSubmit} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
};
