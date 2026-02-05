'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tag } from '@/types';

// =============================================================================
// Types
// =============================================================================

interface TagBadgeProps {
  tag: Tag | { name: string; color?: string | null };
  onRemove?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

// =============================================================================
// Color Utilities
// =============================================================================

const TAG_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300' },
  { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
];

function getTagColor(name: string, customColor?: string | null) {
  if (customColor) {
    return {
      style: { backgroundColor: `${customColor}20`, color: customColor },
    };
  }
  // Generate consistent color based on tag name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TAG_COLORS.length;
  return { classes: TAG_COLORS[index] };
}

// =============================================================================
// TagBadge Component
// =============================================================================

export function TagBadge({ tag, onRemove, size = 'sm', className }: TagBadgeProps) {
  const colorInfo = getTagColor(tag.name, tag.color);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        colorInfo.classes?.bg,
        colorInfo.classes?.text,
        className
      )}
      style={colorInfo.style}
    >
      <span className="truncate max-w-[100px]">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors',
            size === 'sm' ? 'p-0.5' : 'p-1'
          )}
          aria-label={`Remove ${tag.name} tag`}
        >
          <X className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </button>
      )}
    </span>
  );
}

// =============================================================================
// TagBadgeList Component
// =============================================================================

interface TagBadgeListProps {
  tags: Array<Tag | { name: string; color?: string | null }>;
  onRemove?: (index: number) => void;
  size?: 'sm' | 'md';
  maxVisible?: number;
  className?: string;
}

export function TagBadgeList({
  tags,
  onRemove,
  size = 'sm',
  maxVisible = 3,
  className,
}: TagBadgeListProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visibleTags.map((tag, index) => (
        <TagBadge
          key={'id' in tag ? tag.id : tag.name}
          tag={tag}
          size={size}
          onRemove={onRemove ? () => onRemove(index) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground px-1.5">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}
