'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { ToastVariant } from '@/types';

// =============================================================================
// Toast Component
// =============================================================================

export interface ToastProps {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss: (id: string) => void;
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    className: 'bg-success-50 border-success-500 text-success-600',
    iconClassName: 'text-success-500',
  },
  error: {
    icon: AlertCircle,
    className: 'bg-error-50 border-error-500 text-error-600',
    iconClassName: 'text-error-500',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-warning-50 border-warning-500 text-warning-600',
    iconClassName: 'text-warning-500',
  },
  info: {
    icon: Info,
    className: 'bg-info-50 border-info-500 text-info-600',
    iconClassName: 'text-info-500',
  },
};

function Toast({
  id,
  message,
  variant = 'info',
  duration = 5000,
  onDismiss,
}: ToastProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border shadow-lg',
        'min-w-[300px] max-w-[400px]',
        config.className
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 shrink-0', config.iconClassName)} />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

// =============================================================================
// Toast Container
// =============================================================================

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

function ToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
}: ToastContainerProps) {
  return (
    <div
      className={cn(
        'fixed z-[70] flex flex-col gap-2',
        positionClasses[position]
      )}
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            variant={toast.variant}
            duration={toast.duration}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export { Toast, ToastContainer };
