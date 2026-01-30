'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ListTodo, Plus, Search, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

type EmptyStateVariant = 'default' | 'no-results' | 'completed';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: EmptyStateVariant;
  className?: string;
}

// =============================================================================
// Variant Configuration
// =============================================================================

const variantConfig: Record<
  EmptyStateVariant,
  {
    icon: React.ElementType;
    iconBgClass: string;
    iconClass: string;
    defaultTitle: string;
    defaultDescription: string;
  }
> = {
  default: {
    icon: ListTodo,
    iconBgClass: 'bg-primary-100 dark:bg-primary-900/30',
    iconClass: 'text-primary-500',
    defaultTitle: 'No tasks yet',
    defaultDescription: 'Create your first task to get started and stay organized.',
  },
  'no-results': {
    icon: Search,
    iconBgClass: 'bg-neutral-100 dark:bg-neutral-800',
    iconClass: 'text-neutral-500',
    defaultTitle: 'No tasks found',
    defaultDescription: 'Try adjusting your filters or search terms.',
  },
  completed: {
    icon: CheckCircle,
    iconBgClass: 'bg-success-100 dark:bg-success-900/30',
    iconClass: 'text-success-500',
    defaultTitle: 'All done!',
    defaultDescription: "You've completed all your tasks. Great job!",
  },
};

// =============================================================================
// EmptyState Component
// =============================================================================

export function EmptyState({
  title,
  description,
  actionLabel = 'Create Task',
  onAction,
  variant = 'default',
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('text-center py-16', className)}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3, type: 'spring' }}
        className={cn(
          'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center',
          config.iconBgClass
        )}
      >
        <Icon className={cn('w-8 h-8', config.iconClass)} />
      </motion.div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-lg font-semibold text-foreground mb-2"
      >
        {title || config.defaultTitle}
      </motion.h3>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground mb-6 max-w-sm mx-auto"
      >
        {description || config.defaultDescription}
      </motion.p>

      {/* Action Button */}
      {onAction && variant === 'default' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Button onClick={onAction} iconLeading={<Plus className="w-4 h-4" />}>
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
