'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div
      role="status"
      aria-label="Assistant is typing"
      className={cn(
        'flex items-center gap-1 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500"
            animate={{
              y: [0, -4, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
    </div>
  );
}
