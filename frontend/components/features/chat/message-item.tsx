'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Message, ToolCallResult } from '@/types';
import { User, Bot, CheckCircle, XCircle } from 'lucide-react';

interface MessageItemProps {
  message: Message;
}

function ToolResultDisplay({ result }: { result: ToolCallResult }) {
  const toolLabels: Record<string, string> = {
    add_task: 'Add Task',
    list_tasks: 'List Tasks',
    complete_task: 'Complete Task',
    delete_task: 'Delete Task',
    update_task: 'Update Task',
  };

  return (
    <div
      className={cn(
        'mt-2 p-2 rounded-md text-sm border',
        result.success
          ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
          : 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800'
      )}
    >
      <div className="flex items-center gap-2">
        {result.success ? (
          <CheckCircle className="w-4 h-4 text-success-500" />
        ) : (
          <XCircle className="w-4 h-4 text-error-500" />
        )}
        <span className="font-medium">
          {toolLabels[result.tool] || result.tool}
        </span>
      </div>
      {result.error && (
        <p className="mt-1 text-error-600 dark:text-error-400">{result.error}</p>
      )}
    </div>
  );
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex gap-3 px-4 py-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
      role="article"
      aria-label={`${isUser ? 'You' : 'Assistant'} said`}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary-500 text-white'
            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[75%] flex flex-col',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'px-4 py-2 rounded-2xl whitespace-pre-wrap',
            isUser
              ? 'bg-primary-500 text-white rounded-br-md'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-md'
          )}
        >
          {message.content}
        </div>

        {/* Tool Results */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-1 w-full">
            {message.tool_calls.map((result, index) => (
              <ToolResultDisplay key={index} result={result} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </motion.div>
  );
}
