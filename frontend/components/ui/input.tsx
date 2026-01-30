'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  iconLeading?: React.ReactNode;
  iconTrailing?: React.ReactNode;
  floatingLabel?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      iconLeading,
      iconTrailing,
      floatingLabel = false,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    // Always call useId unconditionally to satisfy React rules
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(!!e.target.value);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    const isLabelFloating = floatingLabel && (isFocused || hasValue || props.value || props.defaultValue);

    return (
      <div className="relative w-full">
        {/* Standard label (non-floating) */}
        {label && !floatingLabel && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              error ? 'text-error-600' : 'text-neutral-700 dark:text-neutral-300',
              disabled && 'opacity-50'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {/* Leading icon */}
          {iconLeading && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {iconLeading}
            </div>
          )}

          {/* Floating label */}
          {label && floatingLabel && (
            <label
              htmlFor={inputId}
              className={cn(
                'absolute left-3 transition-all duration-200 pointer-events-none',
                isLabelFloating
                  ? 'top-1 text-xs'
                  : 'top-1/2 -translate-y-1/2 text-base',
                error
                  ? 'text-error-500'
                  : isFocused
                    ? 'text-primary-500'
                    : 'text-neutral-400',
                iconLeading && !isLabelFloating && 'left-10',
                disabled && 'opacity-50'
              )}
            >
              {label}
            </label>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              // Base styles
              'flex w-full rounded-md border bg-transparent text-base',
              'transition-all duration-150',
              'placeholder:text-neutral-400',
              'file:border-0 file:bg-transparent file:text-sm file:font-medium',
              // Sizes
              floatingLabel ? 'h-14 px-3 pt-5 pb-1' : 'h-10 px-3 py-2',
              // Icon padding
              iconLeading && 'pl-10',
              iconTrailing && 'pr-10',
              // States
              error
                ? 'border-error-500 focus:border-error-500 focus:ring-2 focus:ring-error-500/20'
                : 'border-input focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
              'focus:outline-none',
              // Disabled
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-800',
              className
            )}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            {...props}
          />

          {/* Trailing icon */}
          {iconTrailing && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {iconTrailing}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p className="mt-1.5 text-sm text-error-500" role="alert">
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-neutral-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
