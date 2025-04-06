import { ItemCategory } from '@/lib/db';

export type FormValues = {
  name: string;
  description?: string;
  category: ItemCategory;
  images?: string[];
};

export type DefaultValues = Partial<{
  name: string;
  description: string;
  category: ItemCategory;
  images: string[];
}>;
