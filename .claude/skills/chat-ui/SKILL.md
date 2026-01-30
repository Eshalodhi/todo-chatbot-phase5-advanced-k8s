# Chat UI Component Skill

## Purpose
Guide implementation of React chat interface for AI task management agent in Phase III.

---

## Component Overview

```
┌────────────────────────────────────────────────────────────┐
│                      Chat Header                            │
│  [< Back]          AI Assistant            [New Chat]       │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 User: Add a task to buy groceries                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🤖 Assistant: I've added "Buy groceries" to your    │   │
│  │    tasks! Is there anything else you'd like to do?  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🤖 ● ● ● Typing...                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  [Send]      │
│  │ Type your message...                      │              │
│  └──────────────────────────────────────────┘              │
└────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
frontend/components/
├── chat/
│   ├── Chat.tsx              # Main container
│   ├── ChatHeader.tsx        # Header with controls
│   ├── MessageList.tsx       # Scrollable message area
│   ├── MessageBubble.tsx     # Individual message
│   ├── ChatInput.tsx         # Input + send button
│   ├── TypingIndicator.tsx   # Loading animation
│   └── index.ts              # Exports
├── hooks/
│   └── use-chat.ts           # Chat logic hook
└── types/
    └── chat.ts               # TypeScript types
```

---

## TypeScript Types

```typescript
// types/chat.ts

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  tool: string;
  arguments: Record<string, unknown>;
  result: {
    success: boolean;
    task?: Task;
    tasks?: Task[];
    error?: string;
    message?: string;
  };
}

export interface Task {
  task_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface ChatRequest {
  conversation_id?: string;
  message: string;
}

export interface ChatResponse {
  conversation_id: string;
  response: string;
  tool_calls: ToolCall[];
}

export interface ChatState {
  messages: Message[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
}
```

---

## useChat Hook

```typescript
// hooks/use-chat.ts

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { Message, ChatResponse, ToolCall } from '@/types/chat';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface UseChatOptions {
  initialConversationId?: string;
  onError?: (error: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    options.initialConversationId || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to track if we should abort
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get auth token
  const getToken = useCallback(() => {
    return localStorage.getItem('access_token');
  }, []);

  // Send message to API
  const sendMessage = useCallback(async (content: string) => {
    if (!user?.id) {
      setError('Please sign in to use chat');
      return;
    }

    if (!content.trim()) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${API_URL}/api/${user.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: content.trim(),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error: ${response.status}`);
      }

      const data: ChatResponse = await response.json();

      // Update conversation ID
      if (!conversationId) {
        setConversationId(data.conversation_id);
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        toolCalls: data.tool_calls,
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      options.onError?.(errorMessage);

      // Remove optimistic user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));

    } finally {
      setIsLoading(false);
    }
  }, [user?.id, conversationId, getToken, options]);

  // Start new conversation
  const newConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    newConversation,
    clearError,
  };
}
```

---

## Main Chat Component

```tsx
// components/chat/Chat.tsx

'use client';

import { useRef, useEffect } from 'react';
import { useChat } from '@/hooks/use-chat';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useToast } from '@/components/providers/toast-provider';

interface ChatProps {
  initialConversationId?: string;
  onBack?: () => void;
}

export function Chat({ initialConversationId, onBack }: ChatProps) {
  const { error: showError } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    conversationId,
    isLoading,
    error,
    sendMessage,
    newConversation,
    clearError,
  } = useChat({
    initialConversationId,
    onError: showError,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Show error toast
  useEffect(() => {
    if (error) {
      showError(error);
      clearError();
    }
  }, [error, showError, clearError]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <ChatHeader
        onBack={onBack}
        onNewChat={newConversation}
        conversationId={conversationId}
      />

      {/* Messages */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        messagesEndRef={messagesEndRef}
      />

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
        placeholder="Ask me to manage your tasks..."
      />
    </div>
  );
}
```

---

## Chat Header

```tsx
// components/chat/ChatHeader.tsx

'use client';

import { ArrowLeft, Plus, MessageSquare } from 'lucide-react';

interface ChatHeaderProps {
  onBack?: () => void;
  onNewChat: () => void;
  conversationId: string | null;
}

export function ChatHeader({ onBack, onNewChat, conversationId }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left: Back button */}
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Center: Title */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary-500" />
        <h1 className="font-semibold text-foreground">AI Assistant</h1>
      </div>

      {/* Right: New chat */}
      <button
        onClick={onNewChat}
        className="p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Start new chat"
        title="New conversation"
      >
        <Plus className="w-5 h-5" />
      </button>
    </header>
  );
}
```

---

## Message List

```tsx
// components/chat/MessageList.tsx

'use client';

import { RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import type { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  messagesEndRef: RefObject<HTMLDivElement>;
}

export function MessageList({ messages, isLoading, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
            <span className="text-3xl">🤖</span>
          </div>
          <h2 className="text-lg font-medium text-foreground mb-2">
            How can I help you today?
          </h2>
          <p className="text-muted-foreground max-w-sm">
            Ask me to add, list, complete, or delete tasks. I'm here to help manage your to-do list!
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {[
              'Add a task to buy groceries',
              'Show my pending tasks',
              'What did I complete today?',
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="px-3 py-1.5 text-sm rounded-full border border-border hover:bg-muted transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <AnimatePresence initial={false}>
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MessageBubble message={message} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Typing indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <TypingIndicator />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

---

## Message Bubble

```tsx
// components/chat/MessageBubble.tsx

'use client';

import { User, Bot, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, ToolCall } from '@/types/chat';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary-500 text-white'
            : 'bg-secondary-100 dark:bg-secondary-900 text-secondary-600 dark:text-secondary-400'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col max-w-[80%]', isUser && 'items-end')}>
        {/* Message bubble */}
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl',
            isUser
              ? 'bg-primary-500 text-white rounded-br-md'
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Tool calls (for assistant messages) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((toolCall, index) => (
              <ToolCallBadge key={index} toolCall={toolCall} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground mt-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

function ToolCallBadge({ toolCall }: { toolCall: ToolCall }) {
  const isSuccess = toolCall.result.success;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
        isSuccess
          ? 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400'
          : 'bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-400'
      )}
    >
      {isSuccess ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      <span className="font-medium">{formatToolName(toolCall.tool)}</span>
      {toolCall.result.message && (
        <span className="opacity-75">• {toolCall.result.message}</span>
      )}
    </div>
  );
}

function formatToolName(tool: string): string {
  return tool
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}
```

---

## Chat Input

```tsx
// components/chat/ChatInput.tsx

'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);

    // Reset height to auto to get correct scrollHeight
    e.target.style.height = 'auto';
    // Set to scrollHeight but cap at max height
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border border-border bg-muted/50',
              'px-4 py-3 pr-12 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl',
            'flex items-center justify-center',
            'bg-primary-500 text-white',
            'hover:bg-primary-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors duration-200'
          )}
          aria-label="Send message"
        >
          {disabled ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground text-center mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
```

---

## Typing Indicator

```tsx
// components/chat/TypingIndicator.tsx

'use client';

import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary-100 dark:bg-secondary-900 flex items-center justify-center text-secondary-600 dark:text-secondary-400">
        <Bot className="w-4 h-4" />
      </div>

      {/* Typing animation */}
      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-muted">
        <div className="flex gap-1">
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}
```

---

## CSS for Typing Animation

```css
/* globals.css */

@keyframes bounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

.animate-bounce {
  animation: bounce 1s infinite;
}
```

---

## Page Integration

```tsx
// app/(dashboard)/chat/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import { Chat } from '@/components/chat';
import { ProtectedRoute } from '@/hooks/use-auth';

export default function ChatPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="h-screen">
        <Chat onBack={() => router.push('/dashboard')} />
      </div>
    </ProtectedRoute>
  );
}
```

---

## Continue Existing Conversation

```tsx
// app/(dashboard)/chat/[conversationId]/page.tsx

'use client';

import { useRouter, useParams } from 'next/navigation';
import { Chat } from '@/components/chat';
import { ProtectedRoute } from '@/hooks/use-auth';

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  return (
    <ProtectedRoute>
      <div className="h-screen">
        <Chat
          initialConversationId={conversationId}
          onBack={() => router.push('/dashboard')}
        />
      </div>
    </ProtectedRoute>
  );
}
```

---

## Responsive Design

```tsx
// Responsive container for chat
<div className="h-screen max-w-3xl mx-auto">
  <Chat />
</div>

// Mobile-first message bubbles
<div
  className={cn(
    'max-w-[85%] sm:max-w-[75%] md:max-w-[65%]',
    // ... rest of styles
  )}
>
```

---

## Error Handling UI

```tsx
// components/chat/ErrorBanner.tsx

'use client';

import { AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mx-4 mb-2 p-3 rounded-lg bg-error-100 dark:bg-error-900/30 border border-error-200 dark:border-error-800"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-error-600 dark:text-error-400 flex-shrink-0" />
            <p className="text-sm text-error-700 dark:text-error-300 flex-1">
              {error}
            </p>
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-error-200 dark:hover:bg-error-800 transition-colors"
            >
              <X className="w-4 h-4 text-error-600 dark:text-error-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

## Loading States

```tsx
// Full-page loading
export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full bg-background animate-pulse">
      {/* Header skeleton */}
      <div className="h-14 border-b border-border bg-muted/30" />

      {/* Messages skeleton */}
      <div className="flex-1 p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="h-20 border-t border-border bg-muted/30" />
    </div>
  );
}
```

---

## Accessibility

```tsx
// Keyboard navigation
<button
  onClick={handleSend}
  aria-label="Send message"
  aria-disabled={disabled}
  tabIndex={disabled ? -1 : 0}
>
  <Send />
</button>

// Screen reader announcements
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {isLoading ? 'Assistant is typing...' : ''}
</div>

// Message list semantics
<div
  role="log"
  aria-label="Chat messages"
  aria-live="polite"
>
  {messages.map(/* ... */)}
</div>
```

---

## Testing

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Chat } from './Chat';

// Mock fetch
global.fetch = jest.fn();

describe('Chat', () => {
  it('renders empty state initially', () => {
    render(<Chat />);
    expect(screen.getByText(/How can I help you today/i)).toBeInTheDocument();
  });

  it('sends message on enter key', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        conversation_id: '123',
        response: 'Hello!',
        tool_calls: [],
      }),
    });

    render(<Chat />);

    const input = screen.getByPlaceholderText(/type/i);
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Hello!')).toBeInTheDocument();
    });
  });

  it('shows typing indicator while loading', async () => {
    (fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<Chat />);

    const input = screen.getByPlaceholderText(/type/i);
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByLabelText(/send/i));

    expect(screen.getByText(/typing/i)).toBeInTheDocument();
  });

  it('displays error on API failure', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<Chat />);

    const input = screen.getByPlaceholderText(/type/i);
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByLabelText(/send/i));

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });
});
```

---

## Exports

```typescript
// components/chat/index.ts

export { Chat } from './Chat';
export { ChatHeader } from './ChatHeader';
export { MessageList } from './MessageList';
export { MessageBubble } from './MessageBubble';
export { ChatInput } from './ChatInput';
export { TypingIndicator } from './TypingIndicator';
```

---

## Checklist

- [ ] Chat component with message list and input
- [ ] POST /api/{user_id}/chat endpoint integration
- [ ] User and assistant message bubbles
- [ ] Typing indicator during API call
- [ ] conversation_id handling (new/continue)
- [ ] JWT in Authorization header
- [ ] Error handling with toast/banner
- [ ] Loading states and skeleton
- [ ] Auto-scroll to new messages
- [ ] Responsive design (mobile-first)
- [ ] Keyboard navigation (Enter to send)
- [ ] Accessibility (aria labels, live regions)
- [ ] Framer Motion animations
