'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, ChevronDown, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TagBadge } from './tag-badge';
import type { Tag, TaskPriority } from '@/types';

// =============================================================================
// Types
// =============================================================================

export interface FilterState {
  priority: TaskPriority | null;
  tags: string[];
  status: 'all' | 'pending' | 'completed';
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableTags: Tag[];
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const PRIORITY_OPTIONS: { value: TaskPriority | null; label: string; color: string }[] = [
  { value: null, label: 'All Priorities', color: 'text-muted-foreground' },
  { value: 'high', label: 'High', color: 'text-red-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'low', label: 'Low', color: 'text-blue-500' },
];

const STATUS_OPTIONS: { value: 'all' | 'pending' | 'completed'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
];

// =============================================================================
// Dropdown Component
// =============================================================================

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  align?: 'left' | 'right';
}

function Dropdown({ trigger, children, isOpen, onToggle, onClose, align = 'left' }: DropdownProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <div onClick={onToggle}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 mt-1 min-w-[180px] bg-background border border-border rounded-lg shadow-lg overflow-hidden',
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// FilterPanel Component
// =============================================================================

export function FilterPanel({ filters, onChange, availableTags, className }: FilterPanelProps) {
  const [openDropdown, setOpenDropdown] = React.useState<string | null>(null);

  const activeFilterCount = [
    filters.priority !== null,
    filters.tags.length > 0,
    filters.status !== 'all',
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onChange({ priority: null, tags: [], status: 'all' });
  };

  const toggleTag = (tagName: string) => {
    const newTags = filters.tags.includes(tagName)
      ? filters.tags.filter((t) => t !== tagName)
      : [...filters.tags, tagName];
    onChange({ ...filters, tags: newTags });
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* Priority Filter */}
      <Dropdown
        isOpen={openDropdown === 'priority'}
        onToggle={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
        onClose={() => setOpenDropdown(null)}
        trigger={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5',
              filters.priority && 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            )}
          >
            Priority
            {filters.priority && (
              <span className={cn('font-medium', PRIORITY_OPTIONS.find(p => p.value === filters.priority)?.color)}>
                : {filters.priority}
              </span>
            )}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', openDropdown === 'priority' && 'rotate-180')} />
          </Button>
        }
      >
        <div className="p-1">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option.value ?? 'all'}
              onClick={() => {
                onChange({ ...filters, priority: option.value });
                setOpenDropdown(null);
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors',
                filters.priority === option.value
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              )}
            >
              <span className={option.color}>{option.label}</span>
              {filters.priority === option.value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </Dropdown>

      {/* Tags Filter */}
      <Dropdown
        isOpen={openDropdown === 'tags'}
        onToggle={() => setOpenDropdown(openDropdown === 'tags' ? null : 'tags')}
        onClose={() => setOpenDropdown(null)}
        trigger={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5',
              filters.tags.length > 0 && 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            )}
          >
            Tags
            {filters.tags.length > 0 && (
              <span className="text-primary-600 font-medium">({filters.tags.length})</span>
            )}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', openDropdown === 'tags' && 'rotate-180')} />
          </Button>
        }
      >
        <div className="p-1 max-h-[250px] overflow-y-auto">
          {availableTags.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No tags available</p>
          ) : (
            availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.name)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors',
                  filters.tags.includes(tag.name)
                    ? 'bg-primary-50 dark:bg-primary-900/30'
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                )}
              >
                <TagBadge tag={tag} size="sm" />
                {filters.tags.includes(tag.name) && <Check className="w-4 h-4 text-primary-600" />}
              </button>
            ))
          )}
        </div>
      </Dropdown>

      {/* Status Filter */}
      <Dropdown
        isOpen={openDropdown === 'status'}
        onToggle={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
        onClose={() => setOpenDropdown(null)}
        trigger={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1.5',
              filters.status !== 'all' && 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            )}
          >
            Status
            {filters.status !== 'all' && (
              <span className="text-primary-600 font-medium">: {filters.status}</span>
            )}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', openDropdown === 'status' && 'rotate-180')} />
          </Button>
        }
      >
        <div className="p-1">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange({ ...filters, status: option.value });
                setOpenDropdown(null);
              }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm rounded transition-colors',
                filters.status === option.value
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600'
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
              )}
            >
              {option.label}
              {filters.status === option.value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </Dropdown>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="text-muted-foreground hover:text-foreground gap-1"
        >
          <X className="w-3.5 h-3.5" />
          Clear ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
