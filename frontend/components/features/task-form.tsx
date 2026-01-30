'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { createTaskSchema, type CreateTaskInput } from '@/lib/validations';
import { Check, AlertCircle, Loader2, Sparkles } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface TaskFormProps {
  initialData?: {
    title: string;
    description?: string;
  };
  onSubmit: (data: CreateTaskInput) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  className?: string;
}

// =============================================================================
// Character Counter Component
// =============================================================================

interface CharacterCounterProps {
  current: number;
  max: number;
  warning?: number;
}

function CharacterCounter({ current, max, warning = max * 0.8 }: CharacterCounterProps) {
  const isWarning = current >= warning && current < max;
  const isError = current >= max;
  const percentage = Math.min((current / max) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      {/* Progress indicator */}
      <div className="w-12 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full transition-colors duration-200',
            isError && 'bg-error-500',
            isWarning && !isError && 'bg-warning-500',
            !isWarning && !isError && 'bg-primary-500'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      </div>
      <span
        className={cn(
          'text-xs font-medium tabular-nums transition-colors duration-200',
          isError && 'text-error-500',
          isWarning && !isError && 'text-warning-500',
          !isWarning && !isError && 'text-muted-foreground'
        )}
      >
        {current}/{max}
      </span>
    </div>
  );
}

// =============================================================================
// TaskForm Component
// =============================================================================

export function TaskForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
  className,
}: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [isTitleFocused, setIsTitleFocused] = React.useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
    reset,
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
    },
    mode: 'onChange',
  });

  // Watch values for character counters
  const titleValue = watch('title') || '';
  const descriptionValue = watch('description') || '';

  // Handle form submission
  const handleFormSubmit = async (data: CreateTaskInput) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      setShowSuccess(true);

      // Reset form after success animation
      setTimeout(() => {
        reset();
        setShowSuccess(false);
        onCancel();
      }, 600);
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-focus title input
  const titleRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    const timer = setTimeout(() => {
      titleRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.form
      onSubmit={handleSubmit(handleFormSubmit)}
      className={cn('space-y-6', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Title Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="title"
            className={cn(
              'text-sm font-semibold transition-colors duration-200',
              isTitleFocused ? 'text-primary-600 dark:text-primary-400' : 'text-foreground'
            )}
          >
            Task Title
            <span className="text-error-500 ml-0.5">*</span>
          </label>
          <CharacterCounter current={titleValue.length} max={200} />
        </div>

        <div className="relative group">
          <input
            {...register('title')}
            ref={(e) => {
              register('title').ref(e);
              (titleRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
            }}
            id="title"
            placeholder="What needs to be done?"
            disabled={isSubmitting}
            maxLength={200}
            onFocus={() => setIsTitleFocused(true)}
            onBlur={() => setIsTitleFocused(false)}
            className={cn(
              'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200',
              'bg-neutral-50 dark:bg-neutral-800/50',
              'text-neutral-900 dark:text-neutral-100 text-base font-medium',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
              'focus:outline-none focus:bg-white dark:focus:bg-neutral-800',
              errors.title
                ? 'border-error-500 focus:border-error-500 focus:ring-4 focus:ring-error-500/10'
                : 'border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />

          {/* Subtle glow effect on focus */}
          <div
            className={cn(
              'absolute inset-0 -z-10 rounded-xl transition-opacity duration-300',
              'bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-primary-500/20 blur-xl',
              isTitleFocused ? 'opacity-50' : 'opacity-0'
            )}
          />
        </div>

        <AnimatePresence mode="wait">
          {errors.title && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-sm text-error-500 flex items-center gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.title.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="description"
            className={cn(
              'text-sm font-semibold transition-colors duration-200',
              isDescriptionFocused ? 'text-primary-600 dark:text-primary-400' : 'text-foreground'
            )}
          >
            Description
            <span className="text-muted-foreground font-normal ml-1.5">(optional)</span>
          </label>
          <CharacterCounter current={descriptionValue.length} max={1000} />
        </div>

        <div className="relative group">
          <textarea
            {...register('description')}
            id="description"
            placeholder="Add more details about your task..."
            rows={4}
            disabled={isSubmitting}
            maxLength={1000}
            onFocus={() => setIsDescriptionFocused(true)}
            onBlur={() => setIsDescriptionFocused(false)}
            className={cn(
              'w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 resize-none',
              'bg-neutral-50 dark:bg-neutral-800/50',
              'text-neutral-900 dark:text-neutral-100 text-base leading-relaxed',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
              'focus:outline-none focus:bg-white dark:focus:bg-neutral-800',
              errors.description
                ? 'border-error-500 focus:border-error-500 focus:ring-4 focus:ring-error-500/10'
                : 'border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />

          {/* Subtle glow effect on focus */}
          <div
            className={cn(
              'absolute inset-0 -z-10 rounded-xl transition-opacity duration-300',
              'bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-primary-500/20 blur-xl',
              isDescriptionFocused ? 'opacity-50' : 'opacity-0'
            )}
          />
        </div>

        <AnimatePresence mode="wait">
          {errors.description && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="text-sm text-error-500 flex items-center gap-1.5"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.description.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          Cancel
        </Button>

        <motion.div
          whileHover={{ scale: isSubmitting || !isValid ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting || !isValid ? 1 : 0.98 }}
        >
          <Button
            type="submit"
            disabled={isSubmitting || !isValid}
            className={cn(
              'relative px-6 min-w-[140px] overflow-hidden',
              'bg-gradient-to-r from-primary-500 to-primary-600',
              'hover:from-primary-600 hover:to-primary-700',
              'shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30',
              'transition-all duration-200'
            )}
          >
            <AnimatePresence mode="wait">
              {isSubmitting ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </motion.span>
              ) : showSuccess ? (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    initial={{ rotate: -180 }}
                    animate={{ rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <Check className="w-4 h-4" />
                  </motion.div>
                  Done!
                </motion.span>
              ) : (
                <motion.span
                  key="default"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isEditing ? 'Save Changes' : 'Create Task'}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
      </div>
    </motion.form>
  );
}

// =============================================================================
// Quick Add Task Form (Inline version for dashboard)
// =============================================================================

interface QuickAddTaskProps {
  onSubmit: (title: string) => Promise<void>;
  className?: string;
}

export function QuickAddTask({ onSubmit, className }: QuickAddTaskProps) {
  const [title, setTitle] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(title.trim());
      setTitle('');
      inputRef.current?.focus();
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex items-center gap-2 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800',
        className
      )}
    >
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Quick add task..."
        disabled={isSubmitting}
        maxLength={200}
        className="flex-1 bg-transparent border-none focus:ring-0"
      />
      <Button
        type="submit"
        size="sm"
        disabled={!title.trim() || isSubmitting}
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
      </Button>
    </form>
  );
}
