import { ReactNode } from 'react';

import { ItemForm } from '@/components/ItemForm';
import {
  Dialog,
  DialogContent,
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
  defaultValues?: DefaultValues;
  trigger?: ReactNode;
};

export const ItemFormModal = ({
  trigger,
  isOpen,
  onOpenChange,
  onSubmit,
  title,
  defaultValues,
}: Props) => {
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ItemForm defaultValues={defaultValues} onSubmit={handleSubmit} onCancel={handleCancel} />
      </DialogContent>
    </Dialog>
  );
};
