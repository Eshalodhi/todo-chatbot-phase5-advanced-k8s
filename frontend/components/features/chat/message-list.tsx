'use client';

import * as React from 'react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';
import { MessageItem } from './message-item';
import { TypingIndicator } from './typing-indicator';

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

export function MessageList({ messages, isLoading, className }: MessageListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={containerRef}
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
      className={cn(
        'flex-1 overflow-y-auto',
        className
      )}
    >
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-primary-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
            Start a conversation
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-sm">
            Ask me to manage your tasks. Try saying &quot;Add a task to buy groceries&quot; or &quot;Show my tasks&quot;.
          </p>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </AnimatePresence>

      {isLoading && <TypingIndicator />}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
