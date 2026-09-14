'use client';

import { Bookmark, Check, Filter, Star, X } from 'lucide-react';
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CATEGORY_CONFIG } from '@/lib/config/categories';
import { CATEGORIES, ITEM_CATEGORIES } from '@/lib/constants';
import { ItemCategory } from '@/lib/db';
import { CategoryFilterType, RatingFilter } from '@/lib/search';
import { cn } from '@/lib/utils';

type FilterPanelProps = {
  category?: ItemCategory | null;
  ratingFilter: RatingFilter | null;
  onRatingFilterChange: (filter: RatingFilter | null) => void;
  showCategoryFilter?: boolean;
  categoryFilter?: CategoryFilterType;
  onCategoryFilterChange?: (category: CategoryFilterType) => void;
  className?: string;
};

export function FilterPanel({
  category,
  ratingFilter,
  onRatingFilterChange,
  showCategoryFilter = false,
  categoryFilter = null,
  onCategoryFilterChange,
  className,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const showRatingFilter = category !== 'other';

  if (!showRatingFilter && !showCategoryFilter) {
    return null;
  }

  const handleClearFilters = () => {
    onRatingFilterChange(null);
    if (onCategoryFilterChange) {
      onCategoryFilterChange(null);
    }
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

  const hasActiveFilters = ratingFilter !== null || categoryFilter !== null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5 text-sm group cursor-pointer',
              hasActiveFilters ? 'bg-primary/5 border-primary/20' : ''
            )}
          >
            <Filter
              className={cn(
                'h-4 w-4 transition-colors',
                hasActiveFilters
                  ? 'text-primary'
                  : 'text-muted-foreground group-hover:text-foreground'
              )}
            />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 rounded-sm px-1 py-0 h-5">
                {(ratingFilter ? 1 : 0) + (categoryFilter ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Filters</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {showCategoryFilter && onCategoryFilterChange && (
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Bookmark className="mr-2 h-4 w-4 text-blue-500" />
                  <span className="cursor-pointer">Category</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={() => onCategoryFilterChange(null)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          categoryFilter === null ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span>All categories</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {ITEM_CATEGORIES.map((value) => (
                      <DropdownMenuItem
                        key={value}
                        onClick={() => onCategoryFilterChange(value)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            categoryFilter === value ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span>
                          {value === 'other'
                            ? CATEGORIES[value]
                            : CATEGORY_CONFIG[value].pluralTitle}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          )}

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

          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClearFilters}>
                <X className="mr-2 h-4 w-4" />
                <span className="cursor-pointer">Clear all filters</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex flex-wrap gap-2">
        {categoryFilter && (
          <div>
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 h-8 px-3 cursor-default"
            >
              <Bookmark className="h-3.5 w-3.5 text-blue-500" />
              {CATEGORIES[categoryFilter]}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-1 rounded-full cursor-pointer"
                onClick={() => onCategoryFilterChange?.(null)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Clear filter</span>
              </Button>
            </Badge>
          </div>
        )}

        {ratingFilter && (
          <div>
            <Badge
              variant="secondary"
              className="flex items-center gap-1.5 h-8 px-3 cursor-default"
            >
              <Star className="h-3.5 w-3.5 text-yellow-500" />
              {getRatingFilterLabel()}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-1 rounded-full"
                onClick={() => onRatingFilterChange(null)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Clear filter</span>
              </Button>
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
