'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

import { EmptyState } from '@/components/EmptyState';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import db, { CollectionItem } from '@/lib/db';
import { FormValues } from '@/types';

import { CollectionItemComponent } from './CollectionItem';
import { ItemForm } from './ItemForm';

type Props = {
  items: CollectionItem[];
  onItemChanged: () => void;
  categoryFilter?: string;
};

export function CollectionList({ items, onItemChanged, categoryFilter }: Props) {
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleEditItem = async (data: FormValues) => {
    if (!editingItem?.id) return;

    try {
      const updates: Partial<Omit<CollectionItem, 'id' | 'createdAt'>> = {
        name: data.name,
        description: data.description,
        category: data.category,
        images: data.images || [],
        rating: data.rating,
      };

      await db.updateItem(editingItem.id, updates);
      setIsDialogOpen(false);
      setEditingItem(null);
      onItemChanged();
      toast.success('Item updated successfully');
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await db.deleteItem(id);
      onItemChanged();
      toast.success('Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleToggleExpand = (id: number) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const handleEditClick = (item: CollectionItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const filteredItems = categoryFilter
    ? items.filter((item) =>
        categoryFilter.toLowerCase() === 'books'
          ? item.category === 'book'
          : categoryFilter.toLowerCase() === 'movies'
            ? item.category === 'movie'
            : item.category === 'other'
      )
    : items;

  if (filteredItems.length === 0) {
    return (
      <EmptyState
        message={`No ${categoryFilter?.toLowerCase() || 'items'} in your collection yet`}
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <CollectionItemComponent
            key={item.id}
            item={item}
            onDelete={() => item.id !== undefined && handleDeleteItem(item.id)}
            onEdit={() => handleEditClick(item)}
            isExpanded={expandedItemId === item.id}
            onExpand={() => item.id !== undefined && handleToggleExpand(item.id)}
          />
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogTitle>Edit Item</DialogTitle>
          <ItemForm
            defaultValues={editingItem ?? undefined}
            onSubmit={handleEditItem}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
