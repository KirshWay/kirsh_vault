'use client';

import { PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { SearchResults } from '@/components/SearchResults';
import { Button } from '@/components/ui/button';
import { FilterPanel } from '@/components/ui/FilterPanel';
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

  const { items, pagination, isLoading, addItem, updateItem, deleteItem, changePage } =
    useCategoryItems(category);

  const {
    filteredItems,
    setSearchQuery,
    isSearching,
    searchQuery,
    resultsCount,
    totalCount,
    ratingFilter,
    setRatingFilter,
  } = useSearchItems(items);

  const handleAddItem = async (data: FormValues) => {
    return await addItem(data);
  };

  const handleUpdateItem = async (data: FormValues) => {
    if (!editingItem?.id) return false;

    try {
      await updateItem(editingItem.id, data);
      setIsDialogOpen(false);
      setEditingItem(null);
      return true;
    } catch (error) {
      console.error('Error updating item:', error);
      return false;
    }
  };

  const handleDeleteItem = async (id: number) => {
    await deleteItem(id);
  };

  const handleExpandItem = (id: number) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const handleEditClick = (item: CollectionItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleOpenModal = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <LoadingSpinner message={`Loading ${config.pluralTitle.toLowerCase()}...`} />
      </div>
    );
  }

  const hasItems = items.length > 0;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{config.pluralTitle}</h1>
        <p className="text-muted-foreground">{config.subtitle}</p>
      </header>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold">
          {config.pluralTitle} ({pagination.total})
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <SearchBar
            onSearch={setSearchQuery}
            placeholder={`Search ${config.pluralTitle.toLowerCase()}...`}
            className="w-full sm:w-auto"
          />

          {hasItems && (
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
                  <PlusIcon className="h-4 w-4" />
                  Add {config.title}
                </Button>
              }
            />
          )}
        </div>
      </div>

      {hasItems && (
        <div className="mb-4">
          <FilterPanel
            category={category}
            ratingFilter={ratingFilter}
            onRatingFilterChange={setRatingFilter}
          />
        </div>
      )}

      {hasItems ? (
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
          pagination={
            isSearching
              ? undefined
              : {
                  currentPage: pagination.page,
                  totalPages: pagination.totalPages,
                  onPageChange: changePage,
                }
          }
        />
      ) : (
        <EmptyState
          onAddClick={handleOpenModal}
          message={`Your ${config.title.toLowerCase()} collection is empty`}
        />
      )}

      {!hasItems && (
        <ItemFormModal
          isOpen={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingItem(null);
          }}
          onSubmit={handleAddItem}
          title={`Add First ${config.title}`}
          defaultValues={{ category }}
        />
      )}
    </div>
  );
}
