import { ReactNode } from 'react';

import { ItemForm } from '@/components/ItemForm';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DefaultValues, FormValues } from '@/types';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormValues) => Promise<boolean>;
  title: string;
  defaultValues?: DefaultValues;
  trigger?: ReactNode;
};

export function ItemFormModal({
  isOpen,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
  trigger,
}: Props) {
  const handleSubmit = async (data: FormValues) => {
    const success = await onSubmit(data);
    if (success) {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent containerClassName="max-w-3xl w-full">
        <DialogTitle>{title}</DialogTitle>
        <ItemForm defaultValues={defaultValues} onSubmit={handleSubmit} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
}
