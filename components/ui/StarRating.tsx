'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  maxValue?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
  readonly?: boolean;
};

export function StarRating({
  value = 0,
  onChange,
  maxValue = 10,
  size = 'md',
  showValue = true,
  className,
  readonly = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleStarClick = (newValue: number) => {
    if (readonly) return;
    const updatedValue = value === newValue ? 0 : newValue;
    onChange?.(updatedValue);
  };

  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const containerSizes = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  };

  const starsToShow = maxValue;

  const activeValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className={cn('flex items-center', className)} data-testid="star-rating">
      <div className={cn('flex items-center', containerSizes[size])}>
        {[...Array(starsToShow)].map((_, index) => {
          const starValue = index + 1;
          const isFullStar = activeValue >= starValue;

          return (
            <div
              key={index}
              className={cn(
                'relative cursor-pointer text-yellow-400',
                readonly && 'cursor-default'
              )}
              onClick={() => handleStarClick(starValue)}
              onMouseEnter={() => !readonly && setHoverValue(starValue)}
              onMouseLeave={() => !readonly && setHoverValue(null)}
            >
              <Star
                className={cn(
                  starSizes[size],
                  'transition-colors duration-150',
                  isFullStar ? 'fill-yellow-400' : 'stroke-yellow-400 fill-transparent'
                )}
              />
            </div>
          );
        })}
      </div>

      {showValue && (
        <span
          className={cn(
            'ml-2 font-medium',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm',
            size === 'lg' && 'text-base'
          )}
        >
          {value}/10
        </span>
      )}
    </div>
  );
}
