'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TaskForm } from './task-form';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';
import type { Task, CreateTaskRequest, UpdateTaskRequest } from '@/types';

// =============================================================================
// Create Task Modal
// =============================================================================

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTaskRequest) => Promise<void>;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateTaskModalProps) {
  const handleSubmit = async (data: CreateTaskRequest) => {
    await onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header with gradient accent */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-secondary-500/10" />
          <DialogHeader className="relative px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </motion.div>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Create New Task</DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Add a new task to your list
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form */}
        <div className="px-6 pb-6">
          <TaskForm
            onSubmit={handleSubmit}
            onCancel={onClose}
            isEditing={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Edit Task Modal
// =============================================================================

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSubmit: (taskId: number, data: UpdateTaskRequest) => Promise<void>;
}

export function EditTaskModal({
  isOpen,
  onClose,
  task,
  onSubmit,
}: EditTaskModalProps) {
  const handleSubmit = async (data: UpdateTaskRequest) => {
    if (!task) return;
    await onSubmit(task.id, data);
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        {/* Header with gradient accent */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-500/10 via-transparent to-primary-500/10" />
          <DialogHeader className="relative px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600 flex items-center justify-center shadow-lg shadow-secondary-500/25">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </motion.div>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Edit Task</DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Update your task details
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form */}
        <div className="px-6 pb-6">
          <TaskForm
            initialData={{
              title: task.title,
              description: task.description || '',
            }}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isEditing={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Delete Confirmation Modal
// =============================================================================

interface DeleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onConfirm: (taskId: number) => Promise<void>;
}

export function DeleteTaskModal({
  isOpen,
  onClose,
  task,
  onConfirm,
}: DeleteTaskModalProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    if (!task) return;
    setIsDeleting(true);
    try {
      await onConfirm(task.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header with danger gradient accent */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-error-500/10 via-transparent to-error-600/5" />
          <DialogHeader className="relative px-6 pt-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-error-500 to-error-600 flex items-center justify-center shadow-lg shadow-error-500/25">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                >
                  <AlertTriangle className="w-6 h-6 text-white" />
                </motion.div>
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Delete Task</DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <div className="p-4 rounded-lg bg-muted border border-border">
            <p className="text-foreground text-sm leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-error-600">
                &ldquo;{task.title}&rdquo;
              </span>
              ? This will permanently remove the task from your list.
            </p>
          </div>
        </div>

        {/* Footer with buttons */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={isDeleting}
            className="min-w-[120px]"
          >
            Delete Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Mobile Slide-Up Modal
// =============================================================================

interface SlideUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function SlideUpModal({
  isOpen,
  onClose,
  title,
  children,
}: SlideUpModalProps) {
  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-background rounded-t-2xl shadow-2xl',
              'max-h-[90vh] overflow-auto'
            )}
          >
            {/* Handle bar */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
