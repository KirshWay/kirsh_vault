'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDB } from '@/lib/DBContext';
import { CollectionItem as CollectionItemType } from '@/lib/db';
import { CollectionItem } from './CollectionItem';
import { ItemForm } from './ItemForm';
import { Button } from '@/components/ui/button';

export function CollectionList() {
  const { items, loading } = useDB();
  const [editingItem, setEditingItem] = useState<CollectionItemType | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddClick = () => {
    setEditingItem(undefined);
    setIsFormOpen(true);
  };

  const handleEditItem = (item: CollectionItemType) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingItem(undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Collection</h1>
        <Button
          onClick={handleAddClick}
          className="px-4 py-2"
          size="lg"
        >
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-gray-100 dark:bg-gray-800 rounded-lg"
        >
          <h3 className="text-xl font-medium mb-2">Your collection is empty</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start adding items to see them here
          </p>
          <Button
            onClick={handleAddClick}
            size="lg"
          >
            Add First Item
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {items.map((item) => (
              <CollectionItem
                key={item.id}
                item={item}
                onEdit={handleEditItem}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {isFormOpen && (
          <ItemForm
            item={editingItem}
            onClose={handleCloseForm}
          />
        )}
      </AnimatePresence>
    </div>
  );
} 