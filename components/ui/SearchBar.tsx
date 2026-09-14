'use client';

import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = {
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
  autoFocus?: boolean;
};

export function SearchBar({
  onSearch,
  placeholder = 'Search...',
  className,
  initialValue = '',
  autoFocus = false,
}: Props) {
  const [searchValue, setSearchValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, onSearch]);

  const handleClear = () => {
    setSearchValue('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative w-full sm:max-w-sm group', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
      <Input
        ref={inputRef}
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        aria-label={placeholder}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 focus:border-primary focus-visible:ring-primary"
        autoFocus={autoFocus}
      />
      {searchValue && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 cursor-pointer"
          aria-label="Clear search"
          onClick={handleClear}
          type="button"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
