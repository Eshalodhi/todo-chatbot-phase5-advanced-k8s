'use client';

import * as React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ListTodo, Clock, CheckCircle2, TrendingUp } from 'lucide-react';
import type { TaskStats } from '@/types';

// =============================================================================
// Types
// =============================================================================

interface TaskStatsProps {
  stats: TaskStats;
  isLoading?: boolean;
  className?: string;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bgColor: string;
  delay?: number;
}

// =============================================================================
// Animated Counter Component
// =============================================================================

interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

function AnimatedCounter({ value, duration = 0.5 }: AnimatedCounterProps) {
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 20,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (current) => Math.round(current));
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  React.useEffect(() => {
    const unsubscribe = display.on('change', (latest) => {
      setDisplayValue(latest);
    });
    return unsubscribe;
  }, [display]);

  return <span>{displayValue}</span>;
}

// =============================================================================
// Stat Card Component
// =============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="p-6 rounded-xl bg-card border border-border shadow-sm hover:shadow-lg transition-all"
    >
      <div className="flex items-center gap-4">
        <div className={cn('p-3 rounded-lg shadow-lg', bgColor)}>
          <Icon className={cn('w-6 h-6', color)} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-bold text-foreground">
            <AnimatedCounter value={value} />
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================================
// Skeleton Stat Card
// =============================================================================

function SkeletonStatCard() {
  return (
    <div className="p-6 rounded-xl bg-card border border-border shadow-sm animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-muted" />
        <div className="space-y-2">
          <div className="w-16 h-4 rounded bg-muted" />
          <div className="w-10 h-6 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// TaskStats Component
// =============================================================================

export function TaskStatsGrid({ stats, isLoading, className }: TaskStatsProps) {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-4', className)}>
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-3 gap-4', className)}>
      <StatCard
        icon={ListTodo}
        label="Total Tasks"
        value={stats.total}
        color="text-white"
        bgColor="bg-primary-500"
        delay={0}
      />
      <StatCard
        icon={Clock}
        label="Pending"
        value={stats.pending}
        color="text-white"
        bgColor="bg-warning-500"
        delay={0.1}
      />
      <StatCard
        icon={CheckCircle2}
        label="Completed"
        value={stats.completed}
        color="text-white"
        bgColor="bg-success-500"
        delay={0.2}
      />
    </div>
  );
}

// =============================================================================
// Compact Stats (for sidebar or smaller displays)
// =============================================================================

interface CompactStatsProps {
  stats: TaskStats;
  className?: string;
}

export function CompactStats({ stats, className }: CompactStatsProps) {
  const completionRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('p-4 rounded-lg bg-neutral-50 dark:bg-neutral-900/50', className)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">Progress</span>
        <span className="text-sm text-muted-foreground">
          {stats.completed} / {stats.total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${completionRate}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-primary-500 to-success-500"
        />
      </div>

      {/* Completion rate */}
      <div className="flex items-center gap-1 mt-2">
        <TrendingUp className="w-4 h-4 text-success-500" />
        <span className="text-sm font-medium text-foreground">
          {completionRate}% complete
        </span>
      </div>
    </motion.div>
  );
}
