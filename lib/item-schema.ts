import { z } from 'zod';

import { ITEM_CATEGORIES } from './constants';

export const itemSchema = z.object({
  name: z.string().trim().min(1, { error: 'Name is required' }),
  description: z.string().optional(),
  category: z.enum(ITEM_CATEGORIES, { error: 'Please select a valid category' }),
  images: z.array(z.string()).max(5).optional(),
  rating: z.number().min(0).max(10).optional(),
});
