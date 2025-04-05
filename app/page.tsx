"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { CollectionItemComponent } from "@/components/CollectionItem";
import { EmptyState } from "@/components/EmptyState";
import { ItemForm } from "@/components/ItemForm";
import db, { CollectionItem } from "@/lib/db";
import { toast } from "react-hot-toast";

type FormValues = {
  name: string;
  description?: string;
  category: 'book' | 'movie' | 'other';
  images?: string[];
};

export default function Home() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      setIsLoading(true);
      try {
        const allItems = await db.getAllItems();
        setItems(allItems);
      } catch (error) {
        console.error("Failed to load items:", error);
        toast.error("Failed to load items");
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();
  }, []);

  const handleAddItem = async (data: FormValues) => {
    try {
      const newItem = await db.addItem({
        name: data.name,
        description: data.description,
        category: data.category,
        images: data.images || [],
      });
      
      if (typeof newItem === 'number') {
        const addedItem = await db.getItem(newItem);

        if (addedItem) {
          setItems(prevItems => [addedItem, ...prevItems]);
        }
      } else {
        setItems(prevItems => [newItem as unknown as CollectionItem, ...prevItems]);
      }
      
      toast.success("Item added successfully");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error adding item:", error);
      toast.error("Failed to add item");
    }
  };

  const handleUpdateItem = async (data: FormValues) => {
    if (!editingItem?.id) return;
    
    try {
      const itemId = editingItem.id;
      await db.updateItem(itemId, {
        name: data.name,
        description: data.description,
        category: data.category,
        images: data.images || [],
      });
      
      setItems(prev => 
        prev.map(item => 
          item.id === itemId ? { 
            ...item, 
            name: data.name,
            description: data.description,
            category: data.category,
            images: data.images || [],
          } : item
        )
      );
      
      toast.success("Item updated successfully");
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item");
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await db.deleteItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
      toast.success("Item deleted successfully");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Failed to delete item");
    }
  };

  const handleEditClick = (item: CollectionItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleToggleExpand = (id: number) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  if (isLoading) {
    return (
      <main className="container mx-auto p-4 max-w-5xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading collection...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto p-4 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Collection</h1>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingItem(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent containerClassName="max-w-3xl w-full">
            <DialogTitle>
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
            {isModalOpen && (
              <ItemForm
                defaultValues={editingItem ?? undefined}
                onSubmit={editingItem ? handleUpdateItem : handleAddItem}
                onCancel={handleModalClose}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <EmptyState onAddClick={() => setIsModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
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
      )}
    </main>
  );
}
