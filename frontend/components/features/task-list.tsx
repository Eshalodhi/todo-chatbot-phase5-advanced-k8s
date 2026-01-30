'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCard } from './task-card';
import { EmptyState } from './empty-state';
import { SkeletonTaskCard } from '@/components/ui/skeleton';
import type { Task } from '@/types';

// =============================================================================
// Types
// =============================================================================

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  onToggle: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onCreateTask?: () => void;
  emptyMessage?: string;
  emptyDescription?: string;
}

// =============================================================================
// Animation Config
// =============================================================================

// Custom cubic-bezier for smooth, natural motion
const smoothEasing = [0.4, 0, 0.2, 1] as const;

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonTaskCard key={i} />
      ))}
    </div>
  );
}

// =============================================================================
// TaskList Component
// =============================================================================

export function TaskList({
  tasks,
  isLoading = false,
  onToggle,
  onEdit,
  onDelete,
  onCreateTask,
  emptyMessage = 'No tasks yet',
  emptyDescription = 'Create your first task to get started and stay organized.',
}: TaskListProps) {
  // Show loading skeleton
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Show empty state
  if (tasks.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        description={emptyDescription}
        onAction={onCreateTask}
        actionLabel="Create Task"
      />
    );
  }

  // Render task list with animations
  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{
              duration: 0.3,
              ease: smoothEasing,
              delay: index < 10 ? index * 0.05 : 0, // Stagger only first 10 on initial load
            }}
            layout
          >
            <TaskCard
              task={task}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// TaskListWithFilters Component
// =============================================================================

interface TaskListWithFiltersProps extends Omit<TaskListProps, 'tasks'> {
  tasks: Task[];
  filter: 'all' | 'pending' | 'completed';
}

export function TaskListWithFilters({
  tasks,
  filter,
  ...props
}: TaskListWithFiltersProps) {
  // Filter tasks based on filter value
  const filteredTasks = React.useMemo(() => {
    switch (filter) {
      case 'pending':
        return tasks.filter((task) => !task.is_completed);
      case 'completed':
        return tasks.filter((task) => task.is_completed);
      default:
        return tasks;
    }
  }, [tasks, filter]);

  // Get appropriate empty message based on filter
  const emptyMessage = React.useMemo(() => {
    switch (filter) {
      case 'pending':
        return 'No pending tasks';
      case 'completed':
        return 'No completed tasks';
      default:
        return 'No tasks yet';
    }
  }, [filter]);

  const emptyDescription = React.useMemo(() => {
    switch (filter) {
      case 'pending':
        return "You've completed all your tasks! Great job!";
      case 'completed':
        return "You haven't completed any tasks yet. Keep going!";
      default:
        return 'Create your first task to get started and stay organized.';
    }
  }, [filter]);

  return (
    <TaskList
      {...props}
      tasks={filteredTasks}
      emptyMessage={emptyMessage}
      emptyDescription={emptyDescription}
    />
  );
}
