'use client';

import * as React from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TagBadge } from './tag-badge';
import type { Tag } from '@/types';

// =============================================================================
// Types
// =============================================================================

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  availableTags?: Tag[];
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  className?: string;
}

// =============================================================================
// TagInput Component
// =============================================================================

export function TagInput({
  value,
  onChange,
  availableTags = [],
  placeholder = 'Add tags...',
  disabled = false,
  maxTags = 10,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Filter available tags based on input and already selected
  const filteredTags = React.useMemo(() => {
    const lowercaseInput = inputValue.toLowerCase().trim();
    return availableTags.filter(
      (tag) =>
        !value.includes(tag.name) &&
        (lowercaseInput === '' || tag.name.toLowerCase().includes(lowercaseInput))
    );
  }, [availableTags, inputValue, value]);

  // Check if input matches any existing tag exactly
  const exactMatch = availableTags.find(
    (tag) => tag.name.toLowerCase() === inputValue.toLowerCase().trim()
  );

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    if (value.length >= maxTags) return;

    onChange([...value, trimmed]);
    setInputValue('');
    setIsDropdownOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsDropdownOpen(true);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input container */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-1.5 p-2 rounded-lg border-2 transition-all duration-200',
          'bg-neutral-50 dark:bg-neutral-800/50',
          'border-neutral-200 dark:border-neutral-700',
          'focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/10',
          'focus-within:bg-white dark:focus-within:bg-neutral-800',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <TagIcon className="w-3.5 h-3.5 text-muted-foreground ml-1" />

        {/* Selected tags */}
        {value.map((tagName, index) => (
          <TagBadge
            key={tagName}
            tag={{ name: tagName, color: availableTags.find(t => t.name === tagName)?.color }}
            onRemove={disabled ? undefined : () => removeTag(index)}
            size="sm"
          />
        ))}

        {/* Input field */}
        {value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            className={cn(
              'flex-1 min-w-[80px] bg-transparent border-none outline-none',
              'text-sm text-neutral-900 dark:text-neutral-100',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
              'disabled:cursor-not-allowed'
            )}
          />
        )}
      </div>

      {/* Dropdown */}
      {isDropdownOpen && !disabled && (filteredTags.length > 0 || (inputValue.trim() && !exactMatch)) && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {/* Existing tags */}
            {filteredTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => addTag(tag.name)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <TagBadge tag={tag} size="sm" />
              </button>
            ))}

            {/* Create new tag option */}
            {inputValue.trim() && !exactMatch && !value.includes(inputValue.trim()) && (
              <button
                type="button"
                onClick={() => addTag(inputValue)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border-t border-border"
              >
                <Plus className="w-4 h-4 text-primary-500" />
                <span>
                  Create <span className="font-medium">&quot;{inputValue.trim()}&quot;</span>
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Helper text */}
      <p className="mt-1 text-xs text-muted-foreground">
        Press Enter or comma to add. {value.length}/{maxTags} tags.
      </p>
    </div>
  );
}
