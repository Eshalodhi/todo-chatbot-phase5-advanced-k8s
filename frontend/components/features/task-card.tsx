'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TagBadgeList } from './tag-badge';
import {
  CheckCircle2,
  Circle,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  Flag,
  CalendarClock,
  Repeat,
} from 'lucide-react';
import type { Task } from '@/types';

// =============================================================================
// Types
// =============================================================================

interface TaskCardProps {
  task: Task;
  onToggle: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  className?: string;
}

// =============================================================================
// Dropdown Menu Component
// =============================================================================

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function DropdownMenu({ isOpen, onClose, onEdit, onDelete }: DropdownMenuProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }}
          transition={{
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{ willChange: 'transform, opacity' }}
          className="absolute right-0 top-full mt-1 w-36 rounded-lg bg-background border border-border shadow-lg z-50 overflow-hidden"
        >
          <button
            onClick={() => {
              onEdit();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Checkbox Animation Component
// =============================================================================

interface AnimatedCheckboxProps {
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function AnimatedCheckbox({ checked, onClick, disabled }: AnimatedCheckboxProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        checked
          ? 'bg-primary-500 border-primary-500'
          : 'border-neutral-300 dark:border-neutral-600 hover:border-primary-500',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      aria-label={checked ? 'Mark as incomplete' : 'Mark as complete'}
    >
      <AnimatePresence mode="wait">
        {checked && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </motion.div>
        )}
        {!checked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="group-hover:opacity-100"
          >
            <Circle className="w-3 h-3 text-neutral-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

// =============================================================================
// Priority Badge Component
// =============================================================================

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  low: { label: 'Low', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_CONFIG[priority.toLowerCase()] || PRIORITY_CONFIG.medium;
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium', config.className)}>
      <Flag className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
}

// =============================================================================
// Animation Config
// =============================================================================

// Smooth cubic-bezier easing for natural motion
const smoothEasing = [0.4, 0, 0.2, 1] as const;

const cardTransition = {
  layout: {
    duration: 0.3,
    ease: smoothEasing,
  },
};

// =============================================================================
// TaskCard Component
// =============================================================================

export function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  className,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = React.useState(false);

  // Format date
  const formattedDate = React.useMemo(() => {
    const date = new Date(task.created_at);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }, [task.created_at]);

  return (
    <motion.article
      layout
      transition={cardTransition}
      style={{ willChange: 'transform, opacity' }}
      className={cn(
        'group relative p-4 rounded-lg overflow-visible',
        'bg-card border border-border',
        'hover:border-primary-300',
        'shadow-sm hover:shadow-md',
        'transition-[border-color,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
        task.is_completed && 'opacity-60',
        showMenu && 'z-50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <AnimatedCheckbox
          checked={task.is_completed}
          onClick={() => onToggle(task.id)}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-medium text-foreground transition-all',
              task.is_completed && 'text-muted-foreground line-through'
            )}
          >
            {task.title}
          </h3>

          {task.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {task.priority && task.priority.toLowerCase() !== 'medium' && (
              <PriorityBadge priority={task.priority} />
            )}

            {task.due_date && (
              <span className={cn(
                'flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
                new Date(task.due_date) < new Date() && !task.is_completed
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'text-muted-foreground'
              )}>
                <CalendarClock className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}

            {task.recurrence_pattern && (
              <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30">
                <Repeat className="w-3 h-3" />
                {task.recurrence_pattern}
              </span>
            )}

            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {formattedDate}
            </span>
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mt-2">
              <TagBadgeList tags={task.tags} maxVisible={4} size="sm" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="relative z-10">
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              'opacity-0 group-hover:opacity-100 transition-opacity',
              showMenu && 'opacity-100'
            )}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            aria-label="Task options"
            aria-haspopup="true"
            aria-expanded={showMenu}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>

          <DropdownMenu
            isOpen={showMenu}
            onClose={() => setShowMenu(false)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task.id)}
          />
        </div>
      </div>
    </motion.article>
  );
}
