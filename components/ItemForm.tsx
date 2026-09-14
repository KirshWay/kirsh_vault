'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

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
import { CATEGORIES, ITEM_CATEGORIES } from '@/lib/constants';
import { itemSchema } from '@/lib/item-schema';
import { DefaultValues, FormValues } from '@/types';

type Props = {
  stale?: boolean;
  conflict?: string | null;
  defaultValues?: DefaultValues | null;
  onSubmit: (data: FormValues) => Promise<unknown>;
  onCancel: () => void;
};

export const ItemForm = ({ defaultValues, onSubmit, onCancel, stale = false, conflict }: Props) => {
  const [processingImages, setProcessingImages] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      category: defaultValues?.category ?? 'other',
      images: defaultValues?.images ?? [],
      rating: defaultValues?.rating ?? 0,
    },
  });

  const currentCategory = useWatch({ control: form.control, name: 'category' });
  const handleSubmit = async (data: FormValues) => {
    if (stale || conflict || processingImages) return;
    await onSubmit({ ...data, rating: data.category === 'other' ? 0 : data.rating });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex min-h-0 flex-col">
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-5 sm:px-6">
          {stale && (
            <p role="alert" className="mb-4 rounded-md border p-3 text-sm">
              The collection was restored. Your draft is still shown here. Copy anything you need,
              then close this form and reopen the item.
            </p>
          )}
          {!stale && conflict && (
            <p role="alert" className="mb-4 rounded-md border p-3 text-sm">
              {conflict} Your draft is still shown here; copy anything you need before closing.
            </p>
          )}
          <fieldset
            disabled={form.formState.isSubmitting}
            className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2"
          >
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
                  <Select
                    disabled={form.formState.isSubmitting}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ITEM_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {CATEGORIES[category]}
                        </SelectItem>
                      ))}
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
                <FormItem className="sm:col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description"
                      className="h-24 resize-none"
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
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Rating</FormLabel>
                    <FormControl>
                      <StarRating value={field.value ?? 0} onChange={field.onChange} size="md" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem className="min-w-0 sm:col-span-2">
                  <FormLabel>Images</FormLabel>
                  <Dropzone
                    disabled={form.formState.isSubmitting}
                    onProcessingChange={setProcessingImages}
                    images={field.value ?? []}
                    onChange={field.onChange}
                    accept={{
                      'image/jpeg': ['.jpeg', '.jpg'],
                      'image/png': ['.png'],
                      'image/webp': ['.webp'],
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t bg-background px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={onCancel}
            disabled={form.formState.isSubmitting || processingImages}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="cursor-pointer"
            disabled={stale || !!conflict || form.formState.isSubmitting || processingImages}
          >
            {form.formState.isSubmitting
              ? 'Saving…'
              : defaultValues?.name
                ? 'Update Item'
                : 'Add Item'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
