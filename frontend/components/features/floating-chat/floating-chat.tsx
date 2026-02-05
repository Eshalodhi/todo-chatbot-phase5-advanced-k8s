'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, ChevronDown, Plus, RefreshCw, Minus, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/components/providers/chat-provider';
import { useAuth } from '@/hooks/use-auth';
import { MessageList } from '@/components/features/chat/message-list';
import { ChatInput } from '@/components/features/chat/chat-input';

// =============================================================================
// Floating Chat Button (FAB)
// =============================================================================

function FloatingChatButton({
  onClick,
  isOpen,
  isMinimized
}: {
  onClick: () => void;
  isOpen: boolean;
  isMinimized: boolean;
}) {
  // Determine button state: closed, minimized, or open
  const getIconAndLabel = () => {
    if (!isOpen) {
      return { icon: 'chat', label: 'Open chat' };
    }
    if (isMinimized) {
      return { icon: 'restore', label: 'Restore chat' };
    }
    return { icon: 'close', label: 'Close chat' };
  };

  const { icon, label } = getIconAndLabel();

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'w-[60px] h-[60px] rounded-full',
        'bg-primary-500 hover:bg-primary-600',
        'text-white shadow-lg hover:shadow-xl',
        'flex items-center justify-center',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
      aria-expanded={isOpen}
    >
      <AnimatePresence mode="wait">
        {icon === 'close' && (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <X className="w-6 h-6" />
          </motion.div>
        )}
        {icon === 'restore' && (
          <motion.div
            key="restore"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Maximize2 className="w-6 h-6" />
          </motion.div>
        )}
        {icon === 'chat' && (
          <motion.div
            key="chat"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <MessageSquare className="w-6 h-6" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// =============================================================================
// Chat Widget Panel
// =============================================================================

function ChatWidget() {
  const {
    messages,
    conversationId,
    conversations,
    isLoading,
    error,
    isOpen,
    isMinimized,
    sendMessage,
    loadConversation,
    startNewConversation,
    loadConversations,
    closeChat,
    minimizeChat,
    restoreChat,
    clearError,
  } = useChat();

  const [showConversations, setShowConversations] = React.useState(false);

  // Close conversations dropdown when clicking outside
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowConversations(false);
      }
    };

    if (showConversations) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showConversations]);

  const handleLoadConversation = async (convoId: number) => {
    await loadConversation(convoId);
    setShowConversations(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            height: isMinimized ? 'auto' : undefined
          }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            'fixed bottom-24 right-6 z-50',
            'w-[400px] max-w-[calc(100vw-48px)]',
            !isMinimized && 'h-[600px] max-h-[calc(100vh-120px)]',
            'bg-background border border-border rounded-xl shadow-2xl',
            'flex flex-col overflow-hidden'
          )}
          role="dialog"
          aria-label="AI Chat Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-500" />
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
                AI Assistant
              </h2>
            </div>

            <div className="flex items-center gap-1">
              {/* New conversation button */}
              <button
                onClick={startNewConversation}
                className={cn(
                  'p-2 rounded-lg',
                  'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'transition-colors'
                )}
                aria-label="New conversation"
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Conversation selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowConversations(!showConversations)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm',
                    'text-neutral-600 dark:text-neutral-400',
                    'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                    'transition-colors'
                  )}
                  title="Conversation history"
                >
                  <ChevronDown className={cn(
                    'w-4 h-4 transition-transform',
                    showConversations && 'rotate-180'
                  )} />
                </button>

                <AnimatePresence>
                  {showConversations && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute right-0 top-full mt-1 w-56 bg-background border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                    >
                      {conversations.length === 0 ? (
                        <div className="p-3 text-center text-sm text-neutral-500">
                          No conversations yet
                        </div>
                      ) : (
                        conversations.map((convo) => (
                          <button
                            key={convo.id}
                            onClick={() => handleLoadConversation(convo.id)}
                            className={cn(
                              'w-full px-3 py-2 text-left text-sm',
                              'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                              'transition-colors',
                              convo.id === conversationId && 'bg-primary-50 dark:bg-primary-900/30'
                            )}
                          >
                            <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                              {convo.title || 'Untitled conversation'}
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {new Date(convo.updated_at).toLocaleDateString()}
                            </div>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Minimize/Restore button */}
              <button
                onClick={isMinimized ? restoreChat : minimizeChat}
                className={cn(
                  'p-2 rounded-lg',
                  'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'transition-colors'
                )}
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
              </button>

              {/* Close button */}
              <button
                onClick={closeChat}
                className={cn(
                  'p-2 rounded-lg',
                  'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'transition-colors'
                )}
                aria-label="Close chat"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content - hidden when minimized */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <MessageList
                messages={messages}
                isLoading={isLoading}
                className="flex-1"
              />

              {/* Error state */}
              {error && (
                <div className="px-4 py-2 bg-error-50 dark:bg-error-900/20 border-t border-error-200 dark:border-error-800">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
                    <button
                      onClick={clearError}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <ChatInput
                onSend={sendMessage}
                disabled={isLoading}
                placeholder="Ask me to manage your tasks..."
              />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Main Floating Chat Component
// =============================================================================

export function FloatingChat() {
  const { isAuthenticated } = useAuth();
  const { isOpen, isMinimized, toggleChat } = useChat();

  // Only show floating chat for authenticated users
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <ChatWidget />
      <FloatingChatButton onClick={toggleChat} isOpen={isOpen} isMinimized={isMinimized} />
    </>
  );
}
