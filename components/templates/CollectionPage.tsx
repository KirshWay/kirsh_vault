'use client';

import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { SearchResults } from '@/components/SearchResults';
import { Button } from '@/components/ui/button';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ItemFormModal } from '@/components/ui/modal/ItemFormModal';
import { SearchBar } from '@/components/ui/SearchBar';
import { CATEGORY_CONFIG } from '@/lib/config/categories';
import { CollectionItem, ItemCategory } from '@/lib/db';
import { DEFAULT_PAGE_SIZE, useCollectionItems } from '@/lib/hooks/useCollectionItems';
import { FormValues } from '@/types';

export function CollectionPage({ category = null }: { category?: ItemCategory | null }) {
  const collection = useCollectionItems(1, DEFAULT_PAGE_SIZE, category);
  const { items, pagination, isLoading, error, searchQuery, isSearching, isFiltering } = collection;
  const config = category ? CATEGORY_CONFIG[category] : null;
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const itemTitle = config?.title ?? 'Item';
  const title = config?.pluralTitle ?? 'My Collection';
  const hasCollection = pagination.collectionTotal > 0;

  function openNewItem() {
    setEditingItem(null);
    setIsOpen(true);
  }
  function submit(data: FormValues) {
    return editingItem ? collection.updateItem(editingItem.id, data) : collection.addItem(data);
  }

  return (
    <main className="container mx-auto p-4 max-w-5xl" aria-busy={isLoading}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {config && <p className="text-muted-foreground mt-2">{config.subtitle}</p>}
      </header>
      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-6">
        <SearchBar
          onSearch={collection.setSearchQuery}
          placeholder={config ? `Search ${title.toLowerCase()}...` : 'Search in collection...'}
        />
        <Button ref={addButtonRef} onClick={openNewItem}>
          <Plus className="h-4 w-4" />
          Add {itemTitle}
        </Button>
      </div>
      {(hasCollection || isFiltering) && (
        <div className="mb-4">
          <FilterPanel
            category={category}
            ratingFilter={collection.ratingFilter}
            onRatingFilterChange={collection.setRatingFilter}
            showCategoryFilter={!category}
            categoryFilter={collection.categoryFilter}
            onCategoryFilterChange={collection.setCategoryFilter}
          />
        </div>
      )}
      {error ? (
        <div role="alert" className="space-y-3">
          <p>{error}</p>
          <Button onClick={collection.loadItems}>Try again</Button>
        </div>
      ) : isLoading ? (
        <LoadingSpinner message="Loading collection..." />
      ) : !hasCollection && !isFiltering && !isSearching ? (
        <EmptyState onAddClick={openNewItem} />
      ) : (
        <SearchResults
          items={items}
          isSearching={isSearching}
          isFiltering={isFiltering}
          searchQuery={searchQuery}
          resultsCount={pagination.total}
          totalCount={pagination.collectionTotal}
          onItemDelete={collection.deleteItem}
          onItemEdit={(item) => {
            setEditingItem(item);
            setIsOpen(true);
          }}
          onItemExpand={collection.toggleExpandItem}
          expandedItemId={collection.expandedItemId}
          pagination={{
            currentPage: pagination.page,
            totalPages: pagination.totalPages,
            onPageChange: collection.changePage,
          }}
        />
      )}
      <ItemFormModal
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onSubmit={submit}
        title={editingItem ? `Edit ${itemTitle}` : `Add ${itemTitle}`}
        defaultValues={editingItem ?? { category: category ?? 'other' }}
        fallbackFocusRef={addButtonRef}
      />
    </main>
  );
}
