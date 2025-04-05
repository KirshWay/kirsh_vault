"use client";

import { useState } from "react";
import { CollectionItem } from "@/lib/db";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { CollectionItemComponent } from "./CollectionItem";
import { ItemForm } from "./ItemForm";
import db from "@/lib/db";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type Props = {
  items: CollectionItem[];
  onItemChanged: () => void;
  categoryFilter?: string;
}

export const CollectionList = ({ items, onItemChanged, categoryFilter }: Props) => {
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    try {
      await db.deleteItem(id);
      toast.success("Item deleted");
      onItemChanged();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Error deleting item");
    }
  };

  const handleEdit = (item: CollectionItem) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleExpand = (id: number) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const handleUpdateItem = async (data: {
    name: string;
    description?: string;
    category: 'book' | 'movie' | 'other';
    images?: string[];
  }) => {
    if (!editingItem || !editingItem.id) return;
    
    try {
      await db.updateItem(editingItem.id, data);
      toast.success("Item updated");
      setIsFormOpen(false);
      setEditingItem(null);
      onItemChanged();
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Error updating item");
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogTitle>Edit Item</DialogTitle>
          {isFormOpen && editingItem && (
            <ItemForm 
              defaultValues={editingItem}
              onSubmit={handleUpdateItem}
              onCancel={() => setIsFormOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <AnimatePresence>
        {items.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {items.map((item) => (
              <CollectionItemComponent
                key={item.id}
                item={item}
                onDelete={() => item.id !== undefined && handleDelete(item.id)}
                onEdit={() => handleEdit(item)}
                isExpanded={expandedItemId === item.id}
                onExpand={() => item.id !== undefined && handleExpand(item.id)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <p className="text-muted-foreground">
              {categoryFilter
                ? `No items in ${categoryFilter} category`
                : "No items to display"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 