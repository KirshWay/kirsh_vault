import type { z } from 'zod';

import type { itemSchema } from '@/lib/item-schema';

export type FormValues = z.infer<typeof itemSchema>;
export type DefaultValues = Partial<FormValues>;
