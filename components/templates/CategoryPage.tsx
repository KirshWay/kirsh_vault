'use client';

import { PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { SearchResults } from '@/components/SearchResults';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ItemFormModal } from '@/components/ui/modal/ItemFormModal';
import { SearchBar } from '@/components/ui/SearchBar';
import { CATEGORY_CONFIG } from '@/lib/config/categories';
import { CollectionItem, ItemCategory } from '@/lib/db';
import { useCategoryItems } from '@/lib/hooks/useCategoryItems';
import { useSearchItems } from '@/lib/hooks/useSearchItems';
import { FormValues } from '@/types';

type Props = {
  category: ItemCategory;
};

export function CategoryPage({ category }: Props) {
  const config = CATEGORY_CONFIG[category];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);

  const { items, isLoading, loadItems, addItem, updateItem, deleteItem } =
    useCategoryItems(category);

  const { filteredItems, setSearchQuery, isSearching, searchQuery, resultsCount, totalCount } =
    useSearchItems(items);

  const handleAddItem = async (data: FormValues) => {
    return await addItem(data);
  };

  const handleUpdateItem = async (data: FormValues) => {
    if (!editingItem?.id) return false;

    try {
      await updateItem(editingItem.id, data);
      setIsDialogOpen(false);
      setEditingItem(null);
      loadItems();
      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      return false;
    }
  };

  const handleDeleteItem = async (id: number) => {
    await deleteItem(id);
    loadItems();
  };

  const handleExpandItem = (id: number) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const handleEditClick = (item: CollectionItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{config.pluralTitle}</h1>
        <p className="text-muted-foreground">{config.subtitle}</p>
      </header>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">
          {config.pluralTitle} ({items.length})
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder={`Поиск ${config.pluralTitle.toLowerCase()}...`}
            className="w-full sm:w-auto"
          />

          <ItemFormModal
            isOpen={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingItem(null);
            }}
            onSubmit={editingItem ? handleUpdateItem : handleAddItem}
            title={editingItem ? `Edit ${config.title}` : `Add ${config.title}`}
            defaultValues={editingItem ?? { category }}
            trigger={
              <Button onClick={() => setEditingItem(null)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add {config.title}
              </Button>
            }
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message={`Loading ${config.pluralTitle.toLowerCase()}...`} />
      ) : (
        <SearchResults
          items={filteredItems}
          isSearching={isSearching}
          searchQuery={searchQuery}
          resultsCount={resultsCount}
          totalCount={totalCount}
          onItemDelete={handleDeleteItem}
          onItemEdit={handleEditClick}
          onItemExpand={handleExpandItem}
          expandedItemId={expandedItemId}
        />
      )}
    </div>
  );
}
