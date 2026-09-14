'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { imageEntries } from '@/lib/images';
import { cn } from '@/lib/utils';

type Props = {
  images: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
};

export function ImageViewer({ images, open, onOpenChange, initialIndex = 0 }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [previousProps, setPreviousProps] = useState({ open, initialIndex });

  const propsChanged = previousProps.open !== open || previousProps.initialIndex !== initialIndex;
  if (propsChanged) {
    setPreviousProps({ open, initialIndex });
  }
  const requestedIndex = propsChanged && open ? initialIndex : currentIndex;
  const validIndex = Math.max(0, Math.min(requestedIndex, images.length - 1));
  if (currentIndex !== validIndex) setCurrentIndex(validIndex);

  const navigateToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const navigateToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigateToPrevious();
      } else if (e.key === 'ArrowRight') {
        navigateToNext();
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, navigateToPrevious, navigateToNext, onOpenChange]);

  if (!images.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal>
      <DialogContent
        className="max-w-4xl w-full h-[80vh] sm:h-[50vh] p-0 gap-0 bg-background/90 backdrop-blur-sm shadow-2xl"
        data-testid="image-viewer"
      >
        <DialogTitle className="sr-only">Image Viewer</DialogTitle>
        <DialogDescription className="sr-only">
          Use the arrow keys to browse images and Escape to close.
        </DialogDescription>
        <div className="w-full h-full flex flex-col">
          <div className="relative flex-1 flex items-center justify-center p-4">
            <Image
              unoptimized
              width={1600}
              height={1600}
              src={images[currentIndex]}
              alt={`Image ${currentIndex + 1}`}
              className="max-h-[60vh] h-full w-full object-contain"
            />

            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 sm:left-2 rounded-full bg-black/40 hover:bg-black/60 text-white cursor-pointer"
                  aria-label="Previous image"
                  onClick={navigateToPrevious}
                >
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 sm:right-2 rounded-full bg-black/40 hover:bg-black/60 text-white cursor-pointer"
                  aria-label="Next image"
                  onClick={navigateToNext}
                >
                  <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="p-2 overflow-x-auto">
              <div className="flex space-x-2 justify-center">
                {imageEntries(images).map(({ src: img, key }, idx) => (
                  <button
                    key={key}
                    className={cn(
                      'w-12 h-12 sm:w-16 sm:h-16 rounded-md overflow-hidden flex-shrink-0 border-2 transition-[border-color,opacity] cursor-pointer',
                      currentIndex === idx
                        ? 'border-primary'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    <Image
                      unoptimized
                      width={1600}
                      height={1600}
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
