import { ItemCategory } from '@/lib/db';

import { CollectionPage } from './CollectionPage';

export function CategoryPage({ category }: { category: ItemCategory }) {
  return <CollectionPage key={category} category={category} />;
}
