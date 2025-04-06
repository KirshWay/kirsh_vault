import { BookOpen, Film, LucideIcon, Package } from 'lucide-react';

import { ItemCategory } from '../db';

export const CATEGORY_CONFIG: Record<
  ItemCategory,
  {
    title: string;
    pluralTitle: string;
    subtitle: string;
    icon: LucideIcon;
    route: string;
  }
> = {
  book: {
    title: 'Book',
    pluralTitle: 'Books',
    subtitle: 'Manage your book collection',
    icon: BookOpen,
    route: '/books',
  },
  movie: {
    title: 'Movie',
    pluralTitle: 'Movies',
    subtitle: 'Manage your movie collection',
    icon: Film,
    route: '/cinema',
  },
  other: {
    title: 'Other Item',
    pluralTitle: 'Other Items',
    subtitle: 'Manage your other collectible items',
    icon: Package,
    route: '/other',
  },
};
