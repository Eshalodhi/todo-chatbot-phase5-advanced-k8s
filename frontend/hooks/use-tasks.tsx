'use client';

import * as React from 'react';
import { api, ApiError } from '@/lib/api';
import type { Task, CreateTaskRequest, UpdateTaskRequest, TaskStats } from '@/types';
import { computeStats } from '@/types';
import toast from 'react-hot-toast';

// =============================================================================
// Types
// =============================================================================

interface TasksContextValue {
  tasks: Task[];
  stats: TaskStats;
  isLoading: boolean;
  error: string | null;
  // CRUD operations
  createTask: (data: CreateTaskRequest) => Promise<Task | null>;
  updateTask: (taskId: number, data: UpdateTaskRequest) => Promise<Task | null>;
  deleteTask: (taskId: number) => Promise<boolean>;
  toggleComplete: (taskId: number) => Promise<Task | null>;
  // Refresh
  refetch: () => Promise<void>;
}

// =============================================================================
// Context
// =============================================================================

const TasksContext = React.createContext<TasksContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Compute stats from tasks
  const stats = React.useMemo(() => computeStats(tasks), [tasks]);

  // Fetch tasks from API
  const fetchTasks = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getTasks();
      setTasks(response.tasks);
    } catch (err) {
      if (err instanceof ApiError) {
        // Don't show error for unauthenticated (handled by redirect)
        if (err.status !== 401) {
          setError(err.detail);
          toast.error(err.detail);
        }
      } else {
        const message = 'Failed to load tasks';
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  React.useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Create task
  const createTask = React.useCallback(async (data: CreateTaskRequest): Promise<Task | null> => {
    try {
      const newTask = await api.createTask(data);

      // Refetch all tasks to ensure UI is in sync with server
      const response = await api.getTasks();
      setTasks(response.tasks);

      toast.success('Task created successfully');
      return newTask;
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.detail);
      } else {
        toast.error('Failed to create task');
      }
      return null;
    }
  }, []);

  // Update task
  const updateTask = React.useCallback(async (
    taskId: number,
    data: UpdateTaskRequest
  ): Promise<Task | null> => {
    // Optimistic update for immediate feedback
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, ...data } : task
      )
    );

    try {
      const updatedTask = await api.updateTask(taskId, data);

      // Refetch to ensure sync
      const response = await api.getTasks();
      setTasks(response.tasks);

      toast.success('Task updated successfully');
      return updatedTask;
    } catch (err) {
      // Refetch to restore correct state
      const response = await api.getTasks();
      setTasks(response.tasks);

      if (err instanceof ApiError) {
        toast.error(err.detail);
      } else {
        toast.error('Failed to update task');
      }
      return null;
    }
  }, []);

  // Delete task
  const deleteTask = React.useCallback(async (taskId: number): Promise<boolean> => {
    // Optimistic update for immediate feedback
    setTasks((prev) => prev.filter((task) => task.id !== taskId));

    try {
      await api.deleteTask(taskId);

      // Refetch to ensure sync
      const response = await api.getTasks();
      setTasks(response.tasks);

      toast.success('Task deleted successfully');
      return true;
    } catch (err) {
      // Refetch to restore correct state
      const response = await api.getTasks();
      setTasks(response.tasks);

      if (err instanceof ApiError) {
        toast.error(err.detail);
      } else {
        toast.error('Failed to delete task');
      }
      return false;
    }
  }, []);

  // Toggle complete
  const toggleComplete = React.useCallback(async (taskId: number): Promise<Task | null> => {
    // Optimistic update for immediate feedback
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, is_completed: !task.is_completed } : task
      )
    );

    try {
      const updatedTask = await api.toggleComplete(taskId);

      // Refetch to ensure sync
      const response = await api.getTasks();
      setTasks(response.tasks);

      return updatedTask;
    } catch (err) {
      // Refetch to restore correct state
      const response = await api.getTasks();
      setTasks(response.tasks);

      if (err instanceof ApiError) {
        toast.error(err.detail);
      } else {
        toast.error('Failed to update task');
      }
      return null;
    }
  }, []);

  const value = React.useMemo(
    () => ({
      tasks,
      stats,
      isLoading,
      error,
      createTask,
      updateTask,
      deleteTask,
      toggleComplete,
      refetch: fetchTasks,
    }),
    [tasks, stats, isLoading, error, createTask, updateTask, deleteTask, toggleComplete, fetchTasks]
  );

  return (
    <TasksContext.Provider value={value}>
      {children}
    </TasksContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useTasks(): TasksContextValue {
  const context = React.useContext(TasksContext);

  if (!context) {
    throw new Error('useTasks must be used within a TasksProvider');
  }

  return context;
}
