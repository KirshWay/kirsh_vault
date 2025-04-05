'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { CollectionItem } from '@/lib/db';
import { useDB } from '@/lib/DBContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type Props = {
  item?: CollectionItem;
  onClose: () => void;
}

type FormData = {
  name: string;
  description: string;
  image?: FileList;
};

export function ItemForm({ item, onClose }: Props) {
  const { addItem, updateItem } = useDB();
  const [imagePreview, setImagePreview] = useState<string | undefined>(item?.imageData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const form = useForm<FormData>({
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        description: item.description,
      });
      setImagePreview(item.imageData);
    }
  }, [item, form]);

  const handleDialogChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      onClose();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const imageData = data.image?.length
        ? await convertImageToBase64(data.image[0])
        : imagePreview;

      if (item?.id) {
        await updateItem(item.id, {
          name: data.name,
          description: data.description,
          imageData,
        });
      } else {
        await addItem({
          name: data.name,
          description: data.description,
          imageData,
        });
        form.reset();
        setImagePreview(undefined);
      }
      setIsOpen(false);
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Edit Item' : 'Add New Item'}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              rules={{ required: 'Description is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="image">Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  form.setValue('image', e.target.files as FileList);
                  handleImageChange(e);
                }}
              />
              
              {imagePreview && (
                <div className="mt-2 relative w-full h-40">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => setImagePreview(undefined)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Saving...'
                  : item
                  ? 'Save Changes'
                  : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 