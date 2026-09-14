'use client';

import { Star } from 'lucide-react';
import { type ComponentProps, useState } from 'react';

import { cn } from '@/lib/utils';

type StarRatingProps = Omit<ComponentProps<'div'>, 'onChange'> & {
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
  ...props
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

  const activeValue = hoverValue ?? value;

  return (
    <div
      {...props}
      className={cn('flex items-center', className)}
      data-testid="star-rating"
      role="group"
      aria-label={readonly ? `Rating: ${value} out of ${maxValue}` : 'Rating'}
    >
      <div className={cn('flex items-center', containerSizes[size])}>
        {[...Array(starsToShow)].map((_, index) => {
          const starValue = index + 1;
          const isFullStar = activeValue >= starValue;

          const star = (
            <Star
              className={cn(
                starSizes[size],
                'transition-colors duration-150',
                isFullStar ? 'fill-yellow-400' : 'stroke-yellow-400 fill-transparent'
              )}
            />
          );
          if (readonly)
            return (
              <span key={starValue} aria-hidden="true" className="text-yellow-400">
                {star}
              </span>
            );
          return (
            <button
              key={starValue}
              type="button"
              aria-label={`Rate ${starValue} out of ${maxValue}`}
              aria-pressed={value === starValue}
              className="relative cursor-pointer text-yellow-400 rounded focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => handleStarClick(starValue)}
              onMouseEnter={() => setHoverValue(starValue)}
              onMouseLeave={() => setHoverValue(null)}
            >
              {star}
            </button>
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
          {value}/{maxValue}
        </span>
      )}
    </div>
  );
}
