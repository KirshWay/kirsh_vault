"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CollectionList } from "@/components/CollectionList";
import { ItemForm } from "@/components/ItemForm";
import db, { CollectionItem } from "@/lib/db";
import { PlusIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";

export default function BooksPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const books = await db.getItemsByCategory('book');
      setItems(books);
    } catch (error) {
      console.error("Error loading books:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Books</h1>
        <p className="text-muted-foreground">
          Manage your book collection
        </p>
      </header>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">All Books ({items.length})</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Add Book</DialogTitle>
            <ItemForm
              defaultValues={{ name: "", category: 'book' }}
              onSubmit={async (data) => {
                try {
                  await db.addItem(data);
                  setIsDialogOpen(false);
                  loadItems();
                } catch (error) {
                  console.error("Error adding book:", error);
                }
              }}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <CollectionList 
          items={items} 
          onItemChanged={loadItems} 
          categoryFilter="Books" 
        />
      )}
    </div>
  );
} 