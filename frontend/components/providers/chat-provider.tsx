'use client';

import * as React from 'react';
import { api, ApiError } from '@/lib/api';
import type { Message, Conversation, ToolCallResult } from '@/types';

// =============================================================================
// Types
// =============================================================================

interface ChatContextValue {
  // State
  messages: Message[];
  conversationId: number | null;
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  isOpen: boolean;
  isMinimized: boolean;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  loadConversation: (convoId: number) => Promise<void>;
  startNewConversation: () => void;
  loadConversations: () => Promise<void>;
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  minimizeChat: () => void;
  restoreChat: () => void;
  clearError: () => void;

  // Task refresh registration
  registerTaskRefresh: (callback: () => Promise<void>) => void;
}

const ChatContext = React.createContext<ChatContextValue | undefined>(undefined);

// =============================================================================
// Provider
// =============================================================================

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  // Chat state
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [conversationId, setConversationId] = React.useState<number | null>(null);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);

  // Callback ref to avoid stale closures in refreshTasks
  const refreshTasksRef = React.useRef<(() => Promise<void>) | null>(null);

  const loadConversations = React.useCallback(async () => {
    try {
      const convos = await api.getConversations();
      setConversations(convos);
    } catch {
      // Silently fail - conversations will just show empty
      // This can happen on first use when no conversations exist yet
      setConversations([]);
    }
  }, []);

  // Load conversations when chat is opened (lazy loading)
  React.useEffect(() => {
    if (isOpen) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (token) {
        loadConversations();
      }
    }
  }, [isOpen, loadConversations]);

  const loadConversation = React.useCallback(async (convoId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const msgs = await api.getMessages(convoId);
      setMessages(msgs);
      setConversationId(convoId);
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startNewConversation = React.useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  const sendMessage = React.useCallback(async (content: string) => {
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

      if (modifiedTasks && refreshTasksRef.current) {
        // Refresh task list to show changes
        await refreshTasksRef.current();
      }
    } catch (err) {
      console.error('Chat error:', err);

      // Remove optimistic user message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMessage.id));

      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError('Failed to send message. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, loadConversations]);

  // Use ref to track minimized state for toggle callback
  const isMinimizedRef = React.useRef(isMinimized);
  React.useEffect(() => {
    isMinimizedRef.current = isMinimized;
  }, [isMinimized]);

  const toggleChat = React.useCallback(() => {
    if (isMinimizedRef.current) {
      // If minimized, restore instead of closing
      setIsMinimized(false);
    } else {
      // Toggle open/close
      setIsOpen(prev => {
        if (prev) {
          // Currently open, close it
          return false;
        } else {
          // Currently closed, open it
          setIsMinimized(false);
          return true;
        }
      });
    }
  }, []);

  const openChat = React.useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
  }, []);

  const closeChat = React.useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const minimizeChat = React.useCallback(() => {
    setIsMinimized(true);
  }, []);

  const restoreChat = React.useCallback(() => {
    setIsMinimized(false);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const registerTaskRefresh = React.useCallback((callback: () => Promise<void>) => {
    refreshTasksRef.current = callback;
  }, []);

  const value = React.useMemo(
    () => ({
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
      toggleChat,
      openChat,
      closeChat,
      minimizeChat,
      restoreChat,
      clearError,
      registerTaskRefresh,
    }),
    [
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
      toggleChat,
      openChat,
      closeChat,
      minimizeChat,
      restoreChat,
      clearError,
      registerTaskRefresh,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

export function useChat() {
  const context = React.useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

// Hook to register task refresh callback
export function useChatTaskRefresh(refreshTasks: () => Promise<void>) {
  const context = React.useContext(ChatContext);

  React.useEffect(() => {
    if (context) {
      context.registerTaskRefresh(refreshTasks);
    }
  }, [context, refreshTasks]);
}
