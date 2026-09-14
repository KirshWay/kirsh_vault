import { ItemCategory } from '@/lib/db';

import { DEFAULT_PAGE_SIZE, useCollectionItems } from './useCollectionItems';

export function useCategoryItems(
  category: ItemCategory,
  initialPage = 1,
  pageSize = DEFAULT_PAGE_SIZE
) {
  return useCollectionItems(initialPage, pageSize, category);
}
