'use client';

import { motion } from 'framer-motion';
import { Check, Filter, Star, X } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ItemCategory } from '@/lib/db';
import { RatingFilter } from '@/lib/hooks/useSearchItems';
import { cn } from '@/lib/utils';

type FilterPanelProps = {
  category?: ItemCategory;
  ratingFilter: RatingFilter | null;
  onRatingFilterChange: (filter: RatingFilter | null) => void;
  className?: string;
};

export function FilterPanel({
  category,
  ratingFilter,
  onRatingFilterChange,
  className,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const showRatingFilter = category !== 'other';

  if (!showRatingFilter) {
    return null;
  }

  const handleClearFilters = () => {
    onRatingFilterChange(null);
  };

  const getRatingFilterLabel = (): string => {
    if (!ratingFilter) return '';

    switch (ratingFilter.type) {
      case 'min':
        return `${ratingFilter.minValue}+ stars`;
      case 'max':
        return `Up to ${ratingFilter.maxValue} stars`;
      case 'exact':
        return `Exactly ${ratingFilter.exactValue} stars`;
      case 'range':
        return `${ratingFilter.minValue}-${ratingFilter.maxValue} stars`;
      case 'preset':
        switch (ratingFilter.presetName) {
          case 'high':
            return 'High rating (7-10)';
          case 'medium':
            return 'Medium rating (4-6)';
          case 'low':
            return 'Low rating (1-3)';
          default:
            return '';
        }
      default:
        return '';
    }
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 text-sm group cursor-pointer',
              ratingFilter ? 'bg-primary/5 border-primary/20' : ''
            )}
          >
            <Filter
              className={cn(
                'h-4 w-4 transition-colors',
                ratingFilter ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            Filters
            {ratingFilter && (
              <Badge variant="secondary" className="ml-1 rounded-sm px-1 py-0 h-5">
                1
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filters</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {showRatingFilter && (
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Star className="mr-2 h-4 w-4 text-yellow-500" />
                  <span className="cursor-pointer">Rating</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup
                      value={ratingFilter ? 'active' : ''}
                      onValueChange={(value: string) => {
                        if (value === '') onRatingFilterChange(null);
                      }}
                    >
                      {/* <DropdownMenuRadioItem value="">
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            ratingFilter === null ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="cursor-pointer">Any rating</span>
                      </DropdownMenuRadioItem> */}

                      <DropdownMenuItem
                        onClick={() => onRatingFilterChange(null)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            ratingFilter === null ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className="cursor-pointer">Any rating</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs">Presets</DropdownMenuLabel>

                      <DropdownMenuItem
                        onClick={() => onRatingFilterChange({ type: 'preset', presetName: 'high' })}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            ratingFilter?.type === 'preset' && ratingFilter?.presetName === 'high'
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <span>High rating (7-10)</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() =>
                          onRatingFilterChange({ type: 'preset', presetName: 'medium' })
                        }
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            ratingFilter?.type === 'preset' && ratingFilter?.presetName === 'medium'
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <span>Medium rating (4-6)</span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => onRatingFilterChange({ type: 'preset', presetName: 'low' })}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            ratingFilter?.type === 'preset' && ratingFilter?.presetName === 'low'
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <span>Low rating (1-3)</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs">Minimum rating</DropdownMenuLabel>

                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((rating) => (
                        <DropdownMenuItem
                          key={`min-${rating}`}
                          onClick={() => onRatingFilterChange({ type: 'min', minValue: rating })}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              ratingFilter?.type === 'min' && ratingFilter?.minValue === rating
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          <span>{rating}+ stars</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {ratingFilter && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex gap-2"
        >
          <Badge variant="secondary" className="flex items-center gap-1.5 h-8 px-3 cursor-default">
            <Star className="h-3.5 w-3.5 text-yellow-500" />
            {getRatingFilterLabel()}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 ml-1 rounded-full"
              onClick={handleClearFilters}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Clear filter</span>
            </Button>
          </Badge>
        </motion.div>
      )}
    </div>
  );
}
