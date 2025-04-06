'use client';

import { PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { CollectionList } from '@/components/CollectionList';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ItemFormModal } from '@/components/ui/modal/ItemFormModal';
import { CATEGORY_CONFIG } from '@/lib/config/categories';
import { ItemCategory } from '@/lib/db';
import { useCategoryItems } from '@/lib/hooks/useCategoryItems';
import { FormValues } from '@/types';

type Props = {
  category: ItemCategory;
};

export function CategoryPage({ category }: Props) {
  const config = CATEGORY_CONFIG[category];
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { items, isLoading, loadItems, addItem } = useCategoryItems(category);

  const handleAddItem = async (data: FormValues) => {
    return await addItem(data);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{config.pluralTitle}</h1>
        <p className="text-muted-foreground">{config.subtitle}</p>
      </header>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          All {config.pluralTitle} ({items.length})
        </h2>
        <ItemFormModal
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={handleAddItem}
          title={`Add ${config.title}`}
          defaultValues={{ name: '' }}
          trigger={
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add {config.title}
            </Button>
          }
        />
      </div>

      {isLoading ? (
        <LoadingSpinner message={`Loading ${config.pluralTitle.toLowerCase()}...`} />
      ) : (
        <CollectionList
          items={items}
          onItemChanged={loadItems}
          categoryFilter={config.pluralTitle}
        />
      )}
    </div>
  );
}
