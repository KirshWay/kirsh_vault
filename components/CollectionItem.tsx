'use client';

import { motion } from 'framer-motion';
import { ChevronDown, Image as ImageIcon, Pencil, Trash } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ImageViewer } from '@/components/ui/image-viewer';
import { StarRating } from '@/components/ui/StarRating';
import { CATEGORIES } from '@/lib/constants';
import { CollectionItem } from '@/lib/db';
import { cn } from '@/lib/utils';

type Props = {
  item: CollectionItem;
  onDelete: () => void;
  onEdit: () => void;
  isExpanded: boolean;
  onExpand: () => void;
};

export const CollectionItemComponent = ({
  item,
  onDelete,
  onEdit,
  isExpanded,
  onExpand,
}: Props) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = item.images || [];
  const hasImages = images.length > 0;
  const mainImage = hasImages ? images[0] : null;
  const additionalImagesCount = hasImages ? images.length - 1 : 0;

  const openImageViewer = (index: number) => {
    setCurrentImageIndex(index);
    setIsViewerOpen(true);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="h-full flex flex-col overflow-hidden">
          {mainImage ? (
            <div
              className="w-full h-48 relative overflow-hidden group cursor-pointer"
              onClick={() => openImageViewer(0)}
            >
              <img src={mainImage} alt={item.name} className="w-full h-full object-cover" />

              {additionalImagesCount > 0 && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-full flex items-center gap-1">
                  <ImageIcon size={12} />+{additionalImagesCount}
                </div>
              )}

              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  View {images.length > 1 ? 'images' : 'image'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-40 bg-muted flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground opacity-50" />
            </div>
          )}

          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold line-clamp-2">{item.name}</h3>
                <div className="flex items-center mt-1">
                  <span className="text-xs px-2 py-1 bg-secondary rounded-full">
                    {CATEGORIES[item.category] || item.category}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {item.rating !== undefined && item.rating > 0 && item.category !== 'other' && (
                  <div className="mt-2">
                    <StarRating value={item.rating} size="sm" readonly />
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-8 w-8 cursor-pointer"
                onClick={onExpand}
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isExpanded ? 'transform rotate-180' : ''
                  )}
                />
              </Button>
            </div>
          </CardHeader>

          <CardContent
            className={cn(
              'transition-all duration-300 overflow-hidden',
              isExpanded ? 'max-h-96' : 'max-h-0 p-0'
            )}
          >
            <p className="text-sm text-muted-foreground">{item.description || 'No description'}</p>

            {images.length > 1 && (
              <div className="mt-3 flex overflow-x-auto gap-2 pb-2">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden cursor-pointer ring-offset-background transition-all hover:ring-2 hover:ring-ring hover:ring-offset-2"
                    onClick={() => openImageViewer(index)}
                  >
                    <img
                      src={image}
                      alt={`${item.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          <CardFooter className="mt-auto pt-4">
            <div className="flex justify-end w-full gap-2">
              <Button variant="outline" size="sm" className="h-8 cursor-pointer" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 cursor-pointer"
                onClick={onDelete}
              >
                <Trash className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>

      {hasImages && (
        <ImageViewer
          images={images}
          open={isViewerOpen}
          onOpenChange={setIsViewerOpen}
          initialIndex={currentImageIndex}
        />
      )}
    </>
  );
};
