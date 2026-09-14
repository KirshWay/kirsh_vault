export const ITEM_CATEGORIES = ['book', 'movie', 'other'] as const;

export const CATEGORIES: Record<(typeof ITEM_CATEGORIES)[number], string> = {
  book: 'Book',
  movie: 'Movie',
  other: 'Other',
};
