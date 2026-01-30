'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import type { Message, Conversation, ToolCallResult } from '@/types';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { useTasks } from '@/hooks/use-tasks';
import { useToast } from '@/components/providers/toast-provider';
import { MessageSquare, ChevronDown, Plus, RefreshCw } from 'lucide-react';

interface ChatContainerProps {
  className?: string;
}

export function ChatContainer({ className }: ChatContainerProps) {
  const { refetch: refreshTasks } = useTasks();
  const { error: showError } = useToast();

  // Chat state
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [conversationId, setConversationId] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Conversation selector state
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [showConversations, setShowConversations] = React.useState(false);
  const [loadingConversations, setLoadingConversations] = React.useState(false);

  // Load conversations on mount
  React.useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const convos = await api.getConversations();
      setConversations(convos);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadConversation = async (convoId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const msgs = await api.getMessages(convoId);
      setMessages(msgs);
      setConversationId(convoId);
      setShowConversations(false);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      showError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    setShowConversations(false);
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    setIsLoading(true);
    setError(null);

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: Date.now(),
      role: 'user',
      content,
      tool_calls: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await api.sendChatMessage(content, conversationId ?? undefined);

      // Update conversation ID if new
      if (!conversationId) {
        setConversationId(response.conversation_id);
        // Refresh conversations list
        loadConversations();
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.response,
        tool_calls: response.tool_calls.length > 0 ? response.tool_calls : null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Check if any tools modified tasks
      const taskTools = ['add_task', 'complete_task', 'delete_task', 'update_task'];
      const modifiedTasks = response.tool_calls.some(
        (tc: ToolCallResult) => taskTools.includes(tc.tool) && tc.success
      );

      if (modifiedTasks) {
        // Refresh task list to show changes
        await refreshTasks();
      }
    } catch (err) {
      console.error('Chat error:', err);

      // Remove optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));

      if (err instanceof ApiError) {
        setError(err.detail);
        showError(err.detail);
      } else {
        setError('Failed to send message. Please try again.');
        showError('Failed to send message');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-l border-border',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary-500" />
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">
            AI Assistant
          </h2>
        </div>

        <div className="flex items-center gap-2">
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
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Conversation selector */}
          <div className="relative">
            <button
              onClick={() => setShowConversations(!showConversations)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm',
                'text-neutral-600 dark:text-neutral-400',
                'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                'transition-colors'
              )}
            >
              History
              <ChevronDown className={cn(
                'w-4 h-4 transition-transform',
                showConversations && 'rotate-180'
              )} />
            </button>

            {showConversations && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-background border border-border rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                {loadingConversations ? (
                  <div className="p-4 text-center text-sm text-neutral-500">
                    Loading...
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-center text-sm text-neutral-500">
                    No conversations yet
                  </div>
                ) : (
                  conversations.map((convo) => (
                    <button
                      key={convo.id}
                      onClick={() => loadConversation(convo.id)}
                      className={cn(
                        'w-full px-4 py-2 text-left text-sm',
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
              </div>
            )}
          </div>
        </div>
      </div>

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
              onClick={handleRetry}
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
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder="Ask me to manage your tasks..."
      />
    </div>
  );
}
