'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  onAddClick: () => void;
}

export const EmptyState = ({ onAddClick }: Props) => {
  return (
    <div className="border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <Plus className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium mb-2">Your collection is empty</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Start adding items to your collection. You can add books, movies, or other items.
      </p>
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4 mr-2" />
        Add First Item
      </Button>
    </div>
  );
} 