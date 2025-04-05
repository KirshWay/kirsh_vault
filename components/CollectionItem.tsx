'use client';
import { useState } from 'react';
import { CollectionItem as CollectionItemType } from '@/lib/db';
import { useDB } from '@/lib/DBContext';
import { motion } from 'motion/react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Props = {
  item: CollectionItemType;
  onEdit: (item: CollectionItemType) => void;
}

export function CollectionItem({ item, onEdit }: Props) {
  const { deleteItem } = useDB();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setIsDeleting(true);
      if (item.id) {
        await deleteItem(item.id);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      <Card>
        {item.imageData && (
          <div className="w-full h-48 relative overflow-hidden">
            <img
              src={item.imageData}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardHeader>
          <h3 className="text-xl font-semibold">{item.name}</h3>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300 line-clamp-3">
            {item.description}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
          <div className="flex space-x-2">
            <Button 
              variant="default" 
              onClick={() => onEdit(item)}
            >
              Edit
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
} 