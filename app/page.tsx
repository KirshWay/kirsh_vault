'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { SearchResults } from '@/components/SearchResults';
import { Button } from '@/components/ui/button';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ItemFormModal } from '@/components/ui/modal/ItemFormModal';
import { SearchBar } from '@/components/ui/SearchBar';
import { CollectionItem } from '@/lib/db';
import { useCollectionItems } from '@/lib/hooks/useCollectionItems';
import { useSearchItems } from '@/lib/hooks/useSearchItems';
import { FormValues } from '@/types';

export default function Home() {
  const { items, isLoading, expandedItemId, addItem, updateItem, deleteItem, toggleExpandItem } =
    useCollectionItems();

  const {
    filteredItems,
    setSearchQuery,
    isSearching,
    searchQuery,
    resultsCount,
    totalCount,
    ratingFilter,
    setRatingFilter,
    categoryFilter,
    setCategoryFilter,
  } = useSearchItems(items);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">My Collection</h1>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder="Search in collection..."
            className="w-full sm:w-auto"
          />

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
              <Button
                onClick={() => setEditingItem(null)}
                className="w-full sm:w-auto cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            }
          />
        </div>
      </div>

      {items.length > 0 && (
        <div className="mb-4">
          <FilterPanel
            ratingFilter={ratingFilter}
            onRatingFilterChange={setRatingFilter}
            showCategoryFilter={true}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
          />
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState onAddClick={() => setIsModalOpen(true)} />
      ) : (
        <SearchResults
          items={filteredItems}
          isSearching={isSearching}
          searchQuery={searchQuery}
          resultsCount={resultsCount}
          totalCount={totalCount}
          onItemDelete={deleteItem}
          onItemEdit={handleEditClick}
          onItemExpand={toggleExpandItem}
          expandedItemId={expandedItemId}
        />
      )}
    </main>
  );
}
