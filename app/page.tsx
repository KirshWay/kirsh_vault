'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { CollectionItemComponent } from '@/components/CollectionItem';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ItemFormModal } from '@/components/ui/modal/ItemFormModal';
import { CollectionItem } from '@/lib/db';
import { useCollectionItems } from '@/lib/hooks/useCollectionItems';
import { FormValues } from '@/types';

export default function Home() {
  const { items, isLoading, expandedItemId, addItem, updateItem, deleteItem, toggleExpandItem } =
    useCollectionItems();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);

  const handleAddItem = async (data: FormValues) => {
    return await addItem(data);
  };

  const handleUpdateItem = async (data: FormValues) => {
    if (!editingItem?.id) return false;
    return await updateItem(editingItem.id, data);
  };

  const handleEditClick = (item: CollectionItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <main className="container mx-auto p-4 max-w-5xl">
        <LoadingSpinner message="Loading collection..." />
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Collection</h1>
        <ItemFormModal
          isOpen={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) setEditingItem(null);
          }}
          onSubmit={editingItem ? handleUpdateItem : handleAddItem}
          title={editingItem ? 'Edit Item' : 'Add New Item'}
          defaultValues={editingItem ?? undefined}
          trigger={
            <Button onClick={() => setEditingItem(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          }
        />
      </div>

      {items.length === 0 ? (
        <EmptyState onAddClick={() => setIsModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <CollectionItemComponent
              key={item.id}
              item={item}
              onDelete={() => item.id !== undefined && deleteItem(item.id)}
              onEdit={() => handleEditClick(item)}
              isExpanded={expandedItemId === item.id}
              onExpand={() => item.id !== undefined && toggleExpandItem(item.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
