'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  error?: string;
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      description,
      error,
      indeterminate = false,
      disabled,
      checked,
      id,
      ...props
    },
    ref
  ) => {
    // Always call useId unconditionally to satisfy React rules
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const innerRef = React.useRef<HTMLInputElement>(null);

    // Handle indeterminate state
    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    // Merge refs
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement);

    return (
      <div className="relative flex items-start">
        <div className="flex h-5 items-center">
          <div className="relative">
            <input
              ref={innerRef}
              id={inputId}
              type="checkbox"
              disabled={disabled}
              checked={checked}
              className="sr-only peer"
              {...props}
            />
            <div
              className={cn(
                // Base styles
                'h-5 w-5 rounded border-2 cursor-pointer',
                'transition-all duration-150',
                'flex items-center justify-center',
                // States
                'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
                // Unchecked
                !checked && !indeterminate && 'border-neutral-300 dark:border-neutral-600 bg-transparent',
                // Checked/indeterminate
                (checked || indeterminate) && 'border-primary-500 bg-primary-500',
                // Error
                error && 'border-error-500',
                // Disabled
                disabled && 'opacity-50 cursor-not-allowed',
                className
              )}
              onClick={() => {
                if (!disabled && innerRef.current) {
                  innerRef.current.click();
                }
              }}
            >
              <AnimatePresence mode="wait">
                {checked && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  >
                    <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                  </motion.div>
                )}
                {indeterminate && !checked && (
                  <motion.div
                    initial={{ scaleX: 0, opacity: 0 }}
                    animate={{ scaleX: 1, opacity: 1 }}
                    exit={{ scaleX: 0, opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="w-2.5 h-0.5 bg-white rounded-full"
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {(label || description) && (
          <div className="ml-3">
            {label && (
              <label
                htmlFor={inputId}
                className={cn(
                  'text-sm font-medium cursor-pointer',
                  error ? 'text-error-600' : 'text-neutral-800 dark:text-neutral-200',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className={cn(
                'text-sm text-neutral-500',
                disabled && 'opacity-50'
              )}>
                {description}
              </p>
            )}
            {error && (
              <p className="text-sm text-error-500 mt-1" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {error && !label && !description && (
          <p className="ml-3 text-sm text-error-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
