'use client';

import * as React from 'react';
import { ToastContainer } from '@/components/ui/toast';
import type { ToastVariant } from '@/types';

// =============================================================================
// Toast Context
// =============================================================================

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: (message: string, options?: { variant?: ToastVariant; duration?: number }) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

// =============================================================================
// Toast Hook
// =============================================================================

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// =============================================================================
// Toast Provider
// =============================================================================

interface ToastProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export function ToastProvider({
  children,
  position = 'top-right',
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = React.useCallback(() => {
    setToasts([]);
  }, []);

  const toast = React.useCallback(
    (message: string, options?: { variant?: ToastVariant; duration?: number }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = {
        id,
        message,
        variant: options?.variant || 'info',
        duration: options?.duration,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Remove oldest toasts if exceeding max
        if (updated.length > maxToasts) {
          return updated.slice(-maxToasts);
        }
        return updated;
      });

      return id;
    },
    [maxToasts]
  );

  const success = React.useCallback(
    (message: string, duration?: number) => {
      return toast(message, { variant: 'success', duration });
    },
    [toast]
  );

  const error = React.useCallback(
    (message: string, duration?: number) => {
      return toast(message, { variant: 'error', duration });
    },
    [toast]
  );

  const warning = React.useCallback(
    (message: string, duration?: number) => {
      return toast(message, { variant: 'warning', duration });
    },
    [toast]
  );

  const info = React.useCallback(
    (message: string, duration?: number) => {
      return toast(message, { variant: 'info', duration });
    },
    [toast]
  );

  const value = React.useMemo(
    () => ({
      toasts,
      toast,
      success,
      error,
      warning,
      info,
      dismiss,
      dismissAll,
    }),
    [toasts, toast, success, error, warning, info, dismiss, dismissAll]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} position={position} />
    </ToastContext.Provider>
  );
}
