'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Dropzone } from '@/components/ui/dropzone';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StarRating } from '@/components/ui/StarRating';
import { Textarea } from '@/components/ui/textarea';
import { DefaultValues, FormValues } from '@/types';

const formSchema = z.object({
  name: z.string().min(1, { message: 'Name is required' }),
  description: z.string().optional(),
  category: z.enum(['book', 'movie', 'other'], { required_error: 'Please select a category' }),
  images: z.array(z.string()).optional(),
  rating: z.number().min(0).max(10).optional(),
});

type Props = {
  defaultValues?: DefaultValues;
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
};

export const ItemForm = ({ defaultValues, onSubmit, onCancel }: Props) => {
  const [images, setImages] = useState<string[]>(defaultValues?.images || []);
  const [rating, setRating] = useState<number>(defaultValues?.rating || 0);
  const [currentCategory, setCurrentCategory] = useState<string>(
    defaultValues?.category || 'other'
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      description: defaultValues?.description || '',
      category: defaultValues?.category || 'other',
      images: defaultValues?.images || [],
      rating: defaultValues?.rating || 0,
    },
  });

  useEffect(() => {
    form.setValue('images', images);
  }, [images, form]);

  useEffect(() => {
    form.setValue('rating', rating);
  }, [rating, form]);

  const handleImagesChange = (newImages: string[]) => {
    setImages(newImages);
  };

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
  };

  const handleCategoryChange = (category: string) => {
    setCurrentCategory(category);

    if (category === 'other') {
      setRating(0);
    }

    form.setValue('category', category as 'book' | 'movie' | 'other');
  };

  const handleSubmit = (data: FormValues) => {
    const formData = {
      ...data,
      images,
      rating: currentCategory === 'other' ? 0 : rating,
    };

    onSubmit(formData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4 md:col-span-1">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Item name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={handleCategoryChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="book">Book</SelectItem>
                      <SelectItem value="movie">Movie</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description"
                      className="resize-none min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {currentCategory !== 'other' && (
              <FormField
                control={form.control}
                name="rating"
                render={() => (
                  <FormItem>
                    <FormLabel>Rating</FormLabel>
                    <FormControl>
                      <StarRating value={rating} onChange={handleRatingChange} size="md" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="md:col-span-1">
            <FormItem>
              <FormLabel>Images</FormLabel>
              <FormControl>
                <Dropzone
                  images={images}
                  onChange={handleImagesChange}
                  maxFiles={5}
                  maxSize={10 * 1024 * 1024}
                  accept={{
                    'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" className="cursor-pointer" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="cursor-pointer">
            {defaultValues?.name ? 'Update' : 'Add'} Item
          </Button>
        </div>
      </form>
    </Form>
  );
};
