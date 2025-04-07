'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { CollectionItemComponent } from '@/components/CollectionItem';
import { EmptyState } from '@/components/EmptyState';
import { CollectionItem } from '@/lib/db';

type Props = {
  items: CollectionItem[];
  isSearching: boolean;
  searchQuery: string;
  resultsCount: number;
  totalCount: number;
  onItemDelete: (id: number) => void;
  onItemEdit: (item: CollectionItem) => void;
  onItemExpand: (id: number) => void;
  expandedItemId: number | null;
};

export const SearchResults = ({
  items,
  isSearching,
  searchQuery,
  resultsCount,
  totalCount,
  onItemDelete,
  onItemEdit,
  onItemExpand,
  expandedItemId,
}: Props) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  if (isSearching && items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className="my-8"
      >
        <EmptyState message={`Nothing found for "${searchQuery}"`} />
      </motion.div>
    );
  }

  return (
    <>
      {isSearching && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-sm text-muted-foreground"
        >
          Found: {resultsCount} of {totalCount}
        </motion.div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <AnimatePresence>
          {items.map((item) => (
            <CollectionItemComponent
              key={item.id}
              item={item}
              onDelete={() => item.id !== undefined && onItemDelete(item.id)}
              onEdit={() => onItemEdit(item)}
              isExpanded={expandedItemId === item.id}
              onExpand={() => item.id !== undefined && onItemExpand(item.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  );
};
