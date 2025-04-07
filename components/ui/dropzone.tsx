'use client';

import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Accept, FileRejection, useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: Accept;
  className?: string;
};

export function Dropzone({
  images = [],
  onChange,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
  },
  className,
}: Props) {
  const [isHovering, setIsHovering] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        fileRejections.forEach((file) => {
          file.errors.forEach((err) => {
            if (err.code === 'file-too-large') {
              toast.error(
                `File ${file.file.name} is too large. Max size is ${maxSize / 1024 / 1024}MB`
              );
            }
            if (err.code === 'file-invalid-type') {
              toast.error(`File ${file.file.name} has an invalid file type`);
            }
          });
        });
        return;
      }

      if (acceptedFiles.length > 0) {
        const newImages = [...images];

        acceptedFiles.forEach((file) => {
          if (newImages.length >= maxFiles) {
            toast.error(`Maximum ${maxFiles} images allowed`);
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            if (reader.result) {
              newImages.push(reader.result.toString());

              if (
                newImages.length === images.length + acceptedFiles.length ||
                newImages.length === maxFiles
              ) {
                onChange(newImages);
              }
            }
          };
          reader.readAsDataURL(file);
        });
      }
    },
    [images, maxFiles, maxSize, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
  });

  const removeImage = (index: number) => {
    const updatedImages = [...images];
    updatedImages.splice(index, 1);
    onChange(updatedImages);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-primary/70 bg-primary/5'
            : isHovering
              ? 'border-primary/50 bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5'
        )}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <Upload
            className={cn(
              'h-10 w-10',
              isDragActive || isHovering ? 'text-primary' : 'text-muted-foreground'
            )}
          />
          {isDragActive ? (
            <p className="text-primary font-medium">Drop the files here...</p>
          ) : (
            <>
              <p className="font-medium">Drag & drop images here, or click to select</p>
              <p className="text-xs text-muted-foreground mt-1">
                {`Supports JPEG, PNG, WebP • Max ${maxFiles} files • Max ${
                  maxSize / 1024 / 1024
                }MB each`}
              </p>
            </>
          )}
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="group relative aspect-square rounded-md overflow-hidden border border-muted"
            >
              <img src={image} alt={`Upload ${index + 1}`} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {images.length < maxFiles && (
            <div
              {...getRootProps()}
              className="aspect-square rounded-md border border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground/70" />
                <span className="text-xs text-muted-foreground mt-1">Add more</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
