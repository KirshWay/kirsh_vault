'use client';

import { Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { Accept, FileRejection, useDropzone } from 'react-dropzone';

import { Button } from '@/components/ui/button';
import { imageEntries, optimizeImage } from '@/lib/images';
import { cn } from '@/lib/utils';

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  onProcessingChange?: (processing: boolean) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: Accept;
  className?: string;
};

export function Dropzone({
  images,
  onChange,
  onProcessingChange,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024,
  accept = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] },
  className,
}: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const processing = useRef(false);

  async function onDrop(accepted: File[], rejected: FileRejection[]) {
    if (processing.current) return;
    processing.current = true;
    setIsProcessing(true);
    onProcessingChange?.(true);
    const messages = rejected.map(
      ({ file }) =>
        `Could not add ${file.name}. Use JPEG, PNG or WebP up to ${maxSize / 1024 / 1024} MB.`
    );
    const slots = Math.max(0, maxFiles - images.length);
    if (accepted.length > slots) messages.push(`Maximum ${maxFiles} images allowed.`);
    const added: string[] = [];
    try {
      // Decode sequentially to avoid holding several full-resolution bitmaps in memory.
      for (const file of accepted.slice(0, slots)) {
        try {
          added.push(await optimizeImage(file));
        } catch {
          messages.push(`Could not read ${file.name}. Choose another image.`);
        }
      }
      if (added.length) onChange([...images, ...added]);
      setErrors(messages);
    } finally {
      processing.current = false;
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  }

  const hasImages = images.length > 0;
  const isAtLimit = images.length >= maxFiles;
  const isDisabled = isProcessing || isAtLimit;
  const { getRootProps, getInputProps, isDragActive, rootRef } = useDropzone({
    onDrop,
    maxSize,
    accept,
    disabled: isDisabled,
  });

  return (
    <div className={cn('min-w-0 space-y-3', className)} aria-busy={isProcessing}>
      <p role="status" aria-atomic="true" className="text-xs text-muted-foreground">
        {images.length} of {maxFiles} images
      </p>
      {hasImages && (
        <ul
          aria-label="Selected images"
          className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3"
        >
          {imageEntries(images).map(({ src: image, key }, index) => (
            <li key={key} className="min-w-0 rounded-lg border bg-background p-1.5">
              <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                <Image
                  unoptimized
                  src={image}
                  alt={`Upload ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 33vw, 112px"
                  className="object-contain"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Remove image ${index + 1}`}
                disabled={isProcessing}
                className="mt-1 h-8 w-full gap-1 rounded-md px-1 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => {
                  onChange(images.filter((_, current) => current !== index));
                  rootRef.current?.focus();
                }}
              >
                <X className="size-3.5" />
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div
        {...getRootProps({
          role: 'button',
          'aria-label': hasImages ? 'Add more images' : 'Add images',
          'aria-disabled': isDisabled,
          tabIndex: isDisabled ? -1 : 0,
        })}
        className={cn(
          'rounded-lg border border-dashed p-3 text-center transition-colors focus-visible:outline-2 focus-visible:outline-ring',
          isDisabled
            ? 'cursor-default border-border bg-muted/40'
            : 'cursor-pointer border-muted-foreground/40 hover:border-primary/50 hover:bg-primary/5',
          isDragActive && 'border-primary bg-primary/5'
        )}
      >
        <input {...getInputProps({ 'aria-label': 'Choose images', disabled: isDisabled })} />
        <div
          className={cn(
            'flex items-center justify-center gap-2',
            hasImages ? 'py-1' : 'flex-col py-5'
          )}
        >
          <Upload
            className={cn('shrink-0 text-muted-foreground', hasImages ? 'size-4' : 'size-8')}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isProcessing
                ? 'Processing images...'
                : isAtLimit
                  ? 'Image limit reached'
                  : hasImages
                    ? 'Add more images'
                    : 'Choose images'}
            </p>
            {!hasImages && <p className="text-xs text-muted-foreground">or drag and drop here</p>}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        JPEG, PNG or WebP · Up to {maxSize / 1024 / 1024} MB each
      </p>
      {errors.length > 0 && (
        <p role="alert" className="text-sm text-destructive">
          {errors.join(' ')}
        </p>
      )}
    </div>
  );
}
