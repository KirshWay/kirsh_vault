'use client';

import { CollectionItemComponent } from '@/components/CollectionItem';
import { EmptyState } from '@/components/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { CollectionItem } from '@/lib/db';

type Props = {
  items: CollectionItem[];
  isSearching: boolean;
  isFiltering?: boolean;
  searchQuery: string;
  resultsCount: number;
  totalCount: number;
  onItemDelete: (id: number) => void;
  onItemEdit: (item: CollectionItem) => void;
  onItemExpand: (id: number) => void;
  expandedItemId: number | null;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
};

export const SearchResults = ({
  items,
  isSearching,
  isFiltering = false,
  searchQuery,
  resultsCount,
  totalCount,
  onItemDelete,
  onItemEdit,
  onItemExpand,
  expandedItemId,
  pagination,
}: Props) => {
  if ((isSearching || isFiltering) && items.length === 0) {
    return (
      <div className="my-8">
        <EmptyState
          message={
            isSearching ? `Nothing found for "${searchQuery}"` : 'No items match these filters'
          }
        />
      </div>
    );
  }

  return (
    <>
      {isSearching && (
        <div className="mb-4 text-sm text-muted-foreground">
          Found: {resultsCount} of {totalCount}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <CollectionItemComponent
            key={item.id}
            item={item}
            onDelete={() => onItemDelete(item.id)}
            onEdit={() => onItemEdit(item)}
            isExpanded={expandedItemId === item.id}
            onExpand={() => onItemExpand(item.id)}
          />
        ))}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
          />
        </div>
      )}
    </>
  );
};
