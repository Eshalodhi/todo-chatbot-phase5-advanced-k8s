'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Button Variants
const buttonVariants = {
  variant: {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 shadow-sm hover:shadow-md',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700 shadow-sm',
    outline: 'border border-primary-500 text-primary-500 bg-transparent hover:bg-primary-50 dark:hover:bg-primary-900/20',
    ghost: 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800',
    danger: 'bg-error-500 text-white hover:bg-error-600 active:bg-error-700 shadow-sm',
    success: 'bg-success-500 text-white hover:bg-success-600 active:bg-success-700 shadow-sm',
    link: 'text-primary-500 hover:text-primary-600 underline-offset-4 hover:underline p-0 h-auto',
  },
  size: {
    sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
    md: 'h-10 px-4 text-sm rounded-md gap-2',
    lg: 'h-12 px-6 text-base rounded-lg gap-2.5',
    icon: 'h-10 w-10 rounded-md',
    'icon-sm': 'h-8 w-8 rounded-md',
    'icon-lg': 'h-12 w-12 rounded-lg',
  },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
  loading?: boolean;
  iconLeading?: React.ReactNode;
  iconTrailing?: React.ReactNode;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      iconLeading,
      iconTrailing,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          // Variant styles
          buttonVariants.variant[variant],
          // Size styles
          buttonVariants.size[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {children && <span className="ml-2">{children}</span>}
          </>
        ) : (
          <>
            {iconLeading && <span className="shrink-0">{iconLeading}</span>}
            {children}
            {iconTrailing && <span className="shrink-0">{iconTrailing}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
