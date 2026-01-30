'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useTasks } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { TaskStatsGrid } from '@/components/features/task-stats';
import { TaskList } from '@/components/features/task-list';
import {
  CreateTaskModal,
  EditTaskModal,
  DeleteTaskModal,
} from '@/components/features/task-modal';
import {
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  CheckSquare,
  ChevronDown,
} from 'lucide-react';
import type { Task, TaskFilter, TaskSort, CreateTaskRequest, UpdateTaskRequest } from '@/types';

// =============================================================================
// Types
// =============================================================================

type SortDirection = 'asc' | 'desc';

interface SortOption {
  value: TaskSort;
  label: string;
  icon: React.ElementType;
}

// =============================================================================
// Sort Dropdown Component
// =============================================================================

const sortOptions: SortOption[] = [
  { value: 'created_at', label: 'Date Created', icon: Calendar },
  { value: 'title', label: 'Title', icon: ArrowUpDown },
  { value: 'completed', label: 'Status', icon: CheckSquare },
];

interface SortDropdownProps {
  sortBy: TaskSort;
  sortDirection: SortDirection;
  onSortChange: (sort: TaskSort) => void;
  onDirectionChange: () => void;
}

function SortDropdown({
  sortBy,
  sortDirection,
  onSortChange,
  onDirectionChange,
}: SortDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const currentOption = sortOptions.find((opt) => opt.value === sortBy) || sortOptions[0];
  const SortIcon = sortDirection === 'asc' ? ArrowUp : ArrowDown;

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <currentOption.icon className="w-4 h-4" />
        <span className="hidden sm:inline">{currentOption.label}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 mt-2 w-48 rounded-lg bg-background border border-border shadow-lg z-50 overflow-hidden"
          >
            <div className="p-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    sortBy === option.value
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </button>
              ))}
            </div>

            <div className="border-t border-border p-1">
              <button
                onClick={() => {
                  onDirectionChange();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <SortIcon className="w-4 h-4" />
                {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Filter Tabs Component
// =============================================================================

interface FilterTabsProps {
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  counts: { all: number; pending: number; completed: number };
}

function FilterTabs({ filter, onFilterChange, counts }: FilterTabsProps) {
  const options: { value: TaskFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'pending', label: 'Pending', count: counts.pending },
    { value: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg border border-border">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onFilterChange(option.value)}
          className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            filter === option.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {option.label}
          <span
            className={`text-xs px-1.5 py-0.5 rounded-full ${
              filter === option.value
                ? 'bg-primary-100 text-primary-600'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {option.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Dashboard Page
// =============================================================================

export default function DashboardPage() {
  const { user } = useAuth();
  const { tasks, stats, isLoading, createTask, updateTask, deleteTask, toggleComplete } = useTasks();

  // Local state for filtering and sorting
  const [filter, setFilter] = React.useState<TaskFilter>('all');
  const [sortBy, setSortBy] = React.useState<TaskSort>('created_at');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);

  // Filter and sort tasks
  const processedTasks = React.useMemo(() => {
    // First filter
    let result = tasks.filter((task) => {
      if (filter === 'pending') return !task.is_completed;
      if (filter === 'completed') return task.is_completed;
      return true;
    });

    // Then sort
    result = [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'completed':
          comparison = Number(a.is_completed) - Number(b.is_completed);
          break;
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tasks, filter, sortBy, sortDirection]);

  // Handlers
  const handleToggle = async (taskId: number) => {
    await toggleComplete(taskId);
  };

  const handleEdit = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleDelete = (taskId: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      setSelectedTask(task);
      setIsDeleteModalOpen(true);
    }
  };

  const handleCreateTask = () => {
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (data: CreateTaskRequest) => {
    const result = await createTask(data);
    if (result) {
      // Task is already added to state via optimistic update in createTask
      // No refetch needed - it would cause a loading flash and potentially lose the optimistic update
      setIsCreateModalOpen(false);
    }
  };

  const handleEditSubmit = async (taskId: number, data: UpdateTaskRequest) => {
    const result = await updateTask(taskId, data);
    if (result) {
      // Task is already updated in state via optimistic update
      setIsEditModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleDeleteConfirm = async (taskId: number) => {
    const success = await deleteTask(taskId);
    if (success) {
      // Task is already removed from state via optimistic update
      setIsDeleteModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleSortDirectionChange = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  // Get greeting based on time of day
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground">
            {greeting}, {user?.name || 'User'}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {stats.pending === 0
              ? "You're all caught up! Great job!"
              : `You have ${stats.pending} task${stats.pending !== 1 ? 's' : ''} to complete.`}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <TaskStatsGrid stats={stats} isLoading={isLoading} className="mb-8" />

        {/* Task List Section */}
        <div className="bg-card rounded-xl p-6 border border-border shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            {/* Filter Tabs */}
            <FilterTabs
              filter={filter}
              onFilterChange={setFilter}
              counts={{
                all: stats.total,
                pending: stats.pending,
                completed: stats.completed,
              }}
            />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <SortDropdown
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSortChange={setSortBy}
                onDirectionChange={handleSortDirectionChange}
              />

              <Button
                onClick={handleCreateTask}
                iconLeading={<Plus className="w-4 h-4" />}
              >
                <span className="hidden sm:inline">Add Task</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          {/* Task List */}
          <TaskList
            tasks={processedTasks}
            isLoading={isLoading}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreateTask={handleCreateTask}
          />
        </div>

        {/* FAB for mobile */}
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreateTask}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary-500 text-white shadow-lg hover:bg-primary-600 flex items-center justify-center sm:hidden"
          aria-label="Add new task"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      <EditTaskModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onSubmit={handleEditSubmit}
      />

      <DeleteTaskModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
