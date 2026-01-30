# Chat UI Specification

**Parent Spec**: [Phase III AI Chatbot](./spec.md)
**Created**: 2026-01-16
**Status**: Draft

## Overview

React-based chat interface component that allows users to interact with the AI assistant through natural language. The UI integrates with the existing Next.js frontend and follows the established design system.

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         ChatPanel                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    ChatHeader                         │  │
│  │  [Title: AI Assistant]              [Minimize/Close]  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   MessageList                         │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ ChatMessage (user)                              │  │  │
│  │  │ "Add a task to buy groceries"                   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ ChatMessage (assistant)                         │  │  │
│  │  │ "I've created the task 'Buy groceries'"         │  │  │
│  │  │ ┌───────────────────────────────────────────┐   │  │  │
│  │  │ │ ToolResult: add_task ✓                    │   │  │  │
│  │  │ └───────────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │ TypingIndicator                                 │  │  │
│  │  │ ● ● ●                                           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    ChatInput                          │  │
│  │  [Message input...                    ] [Send ➤]      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
frontend/components/
├── chat/
│   ├── index.ts              # Barrel exports
│   ├── ChatPanel.tsx         # Main container component
│   ├── ChatHeader.tsx        # Header with title and controls
│   ├── MessageList.tsx       # Scrollable message container
│   ├── ChatMessage.tsx       # Individual message bubble
│   ├── ChatInput.tsx         # Message input with send
│   ├── TypingIndicator.tsx   # Animated typing dots
│   ├── ToolResult.tsx        # Tool execution result display
│   └── hooks/
│       ├── useChat.ts        # Chat state management
│       ├── useChatApi.ts     # API communication
│       └── useAutoScroll.ts  # Auto-scroll behavior
└── ui/
    └── ... (existing shadcn components)
```

## Component Specifications

### ChatPanel

**Purpose**: Main container component managing chat visibility and layout

```typescript
// frontend/components/chat/ChatPanel.tsx

interface ChatPanelProps {
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback when panel is closed */
  onClose: () => void;
  /** Position on screen */
  position?: 'right' | 'bottom';
  /** Initial conversation ID to load */
  conversationId?: string;
}

export function ChatPanel({
  isOpen,
  onClose,
  position = 'right',
  conversationId
}: ChatPanelProps): JSX.Element
```

**Features**:
- Collapsible panel (slide in/out animation)
- Responsive: full-screen on mobile, panel on desktop
- Maintains state when minimized
- Keyboard shortcut: `Ctrl+Shift+C` to toggle

---

### ChatHeader

**Purpose**: Display title and provide panel controls

```typescript
// frontend/components/chat/ChatHeader.tsx

interface ChatHeaderProps {
  title?: string;
  onMinimize: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ChatHeader({
  title = "AI Assistant",
  onMinimize,
  onClose,
  isLoading = false
}: ChatHeaderProps): JSX.Element
```

**Features**:
- Title with optional loading spinner
- Minimize button (collapse to fab)
- Close button
- Drag handle for repositioning (desktop)

---

### MessageList

**Purpose**: Scrollable container for chat messages

```typescript
// frontend/components/chat/MessageList.tsx

interface MessageListProps {
  messages: Message[];
  isTyping: boolean;
  onRetry?: (messageId: string) => void;
}

export function MessageList({
  messages,
  isTyping,
  onRetry
}: MessageListProps): JSX.Element
```

**Features**:
- Auto-scroll to bottom on new messages
- Scroll-to-bottom button when scrolled up
- Empty state with welcome message
- Loading skeleton on initial load
- Virtualized list for performance (many messages)

---

### ChatMessage

**Purpose**: Individual message bubble with sender distinction

```typescript
// frontend/components/chat/ChatMessage.tsx

interface ChatMessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    tool_calls?: ToolCall[];
    created_at: string;
    error?: boolean;
  };
  onRetry?: () => void;
}

export function ChatMessage({
  message,
  onRetry
}: ChatMessageProps): JSX.Element
```

**Visual Design**:
- User messages: Right-aligned, primary color background
- Assistant messages: Left-aligned, secondary color background
- Error messages: Red border, retry button
- Timestamps: Subtle, shown on hover

**Features**:
- Markdown rendering for assistant messages
- Copy message button on hover
- Retry button for failed messages
- Smooth fade-in animation

---

### ChatInput

**Purpose**: Message input with send functionality

```typescript
// frontend/components/chat/ChatInput.tsx

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "Type a message..."
}: ChatInputProps): JSX.Element
```

**Features**:
- Textarea with auto-resize (up to 4 lines)
- Send button (enabled when message not empty)
- Enter to send, Shift+Enter for newline
- Disabled state during AI processing
- Character counter (max 4000)

---

### TypingIndicator

**Purpose**: Animated indicator while AI is processing

```typescript
// frontend/components/chat/TypingIndicator.tsx

interface TypingIndicatorProps {
  visible: boolean;
}

export function TypingIndicator({
  visible
}: TypingIndicatorProps): JSX.Element
```

**Visual Design**:
- Three animated dots
- Bouncing animation
- Matches assistant message styling

---

### ToolResult

**Purpose**: Display tool execution results inline

```typescript
// frontend/components/chat/ToolResult.tsx

interface ToolResultProps {
  toolCall: {
    tool: string;
    parameters: Record<string, any>;
    result: {
      success: boolean;
      message: string;
      data?: any;
    };
  };
}

export function ToolResult({ toolCall }: ToolResultProps): JSX.Element
```

**Visual Design**:
- Compact inline display
- Icon indicating tool type
- Success/failure indicator
- Expandable details on click

## Custom Hooks

### useChat

**Purpose**: Central chat state management

```typescript
// frontend/components/chat/hooks/useChat.ts

interface ChatState {
  messages: Message[];
  conversationId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface ChatActions {
  sendMessage: (content: string) => Promise<void>;
  loadHistory: (conversationId: string) => Promise<void>;
  clearChat: () => void;
  retryMessage: (messageId: string) => Promise<void>;
}

export function useChat(): ChatState & ChatActions
```

**Features**:
- Message state management
- Optimistic updates (show user message immediately)
- Error handling with retry support
- Conversation persistence

---

### useChatApi

**Purpose**: API communication layer

```typescript
// frontend/components/chat/hooks/useChatApi.ts

interface ChatApiOptions {
  baseUrl?: string;
  onError?: (error: Error) => void;
}

interface ChatApiReturn {
  sendMessage: (message: string, conversationId?: string) => Promise<ChatResponse>;
  getHistory: (conversationId: string) => Promise<Message[]>;
  getConversations: () => Promise<Conversation[]>;
}

export function useChatApi(options?: ChatApiOptions): ChatApiReturn
```

**Features**:
- JWT token attachment
- Error handling
- Request/response typing
- Abort controller for cleanup

---

### useAutoScroll

**Purpose**: Auto-scroll behavior for message list

```typescript
// frontend/components/chat/hooks/useAutoScroll.ts

interface AutoScrollOptions {
  threshold?: number;
  behavior?: ScrollBehavior;
}

export function useAutoScroll<T extends HTMLElement>(
  dependencies: any[],
  options?: AutoScrollOptions
): {
  ref: RefObject<T>;
  scrollToBottom: () => void;
  isScrolledUp: boolean;
}
```

## State Management

### Chat Context

```typescript
// frontend/components/chat/ChatContext.tsx

interface ChatContextValue {
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
  sendMessage: (content: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: PropsWithChildren): JSX.Element

export function useChatContext(): ChatContextValue
```

### State Shape

```typescript
interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // keyed by conversationId
  pendingMessage: string | null;
  isTyping: boolean;
  error: ChatError | null;
}

type ChatAction =
  | { type: 'SEND_MESSAGE'; payload: { content: string } }
  | { type: 'MESSAGE_SENT'; payload: { message: Message; conversationId: string } }
  | { type: 'RECEIVE_RESPONSE'; payload: { response: ChatResponse } }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: ChatError | null }
  | { type: 'LOAD_HISTORY'; payload: { conversationId: string; messages: Message[] } }
  | { type: 'CLEAR_CHAT' };
```

## API Integration

### Send Message Flow

```typescript
async function sendMessage(content: string) {
  // 1. Optimistic update - show user message immediately
  dispatch({ type: 'SEND_MESSAGE', payload: { content } });

  // 2. Show typing indicator
  dispatch({ type: 'SET_TYPING', payload: true });

  try {
    // 3. Call API
    const response = await chatApi.sendMessage(content, activeConversationId);

    // 4. Update with response
    dispatch({ type: 'RECEIVE_RESPONSE', payload: { response } });

    // 5. Refresh task list if tools were called
    if (response.tool_calls?.length > 0) {
      await refreshTasks();
    }
  } catch (error) {
    dispatch({ type: 'SET_ERROR', payload: formatError(error) });
  } finally {
    dispatch({ type: 'SET_TYPING', payload: false });
  }
}
```

### API Client

```typescript
// frontend/lib/api/chat.ts

export const chatApi = {
  async sendMessage(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<ChatResponse> {
    const response = await fetch(`/api/${userId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ message, conversation_id: conversationId })
    });

    if (!response.ok) {
      throw new ChatApiError(await response.json());
    }

    return response.json();
  },

  async getConversations(userId: string): Promise<Conversation[]> {
    const response = await fetch(`/api/${userId}/conversations`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return response.json();
  },

  async getMessages(
    userId: string,
    conversationId: string
  ): Promise<Message[]> {
    const response = await fetch(
      `/api/${userId}/conversations/${conversationId}/messages`,
      { headers: { 'Authorization': `Bearer ${getToken()}` } }
    );
    return response.json();
  }
};
```

## Accessibility Requirements

### ARIA Labels

```tsx
// Message list
<div
  role="log"
  aria-label="Chat messages"
  aria-live="polite"
>
  {messages.map(msg => (
    <div
      role="article"
      aria-label={`${msg.role === 'user' ? 'You' : 'Assistant'} said`}
    >
      {msg.content}
    </div>
  ))}
</div>

// Typing indicator
<div
  role="status"
  aria-label="Assistant is typing"
  aria-live="assertive"
>
  <TypingIndicator visible={isTyping} />
</div>

// Input
<textarea
  aria-label="Chat message input"
  aria-describedby="char-count"
/>
<span id="char-count" aria-live="polite">
  {message.length}/4000 characters
</span>
```

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Escape` | Close chat panel |
| `Ctrl+Shift+C` | Toggle chat panel |
| `Tab` | Navigate between elements |
| `Arrow Up/Down` | Scroll messages |

### Screen Reader Support

- All interactive elements have labels
- Status changes announced (typing, sent, error)
- Tool results announced with context
- Focus management on panel open/close

## Responsive Design

### Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Mobile (<640px) | Full-screen overlay |
| Tablet (640-1024px) | Bottom sheet (50% height) |
| Desktop (>1024px) | Side panel (400px width) |

### Mobile Optimizations

- Full-screen chat experience
- Large touch targets (44px minimum)
- Swipe down to close
- Keyboard-aware input positioning

## Animation Specifications

### Panel Transitions

```css
.chat-panel {
  transition: transform 300ms ease-out;
}

.chat-panel--closed {
  transform: translateX(100%); /* or translateY(100%) for bottom */
}

.chat-panel--open {
  transform: translateX(0);
}
```

### Message Animations

```css
.chat-message {
  animation: message-appear 200ms ease-out;
}

@keyframes message-appear {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Typing Indicator

```css
.typing-dot {
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}
```

## Testing Requirements

### Unit Tests

- [ ] ChatMessage renders correctly for each role
- [ ] ChatInput validates message length
- [ ] TypingIndicator visibility toggles correctly
- [ ] ToolResult displays success/failure states
- [ ] useChat manages state correctly
- [ ] useAutoScroll scrolls on new messages

### Integration Tests

- [ ] Send message flow (optimistic update → API → response)
- [ ] Error handling and retry
- [ ] Conversation history loading
- [ ] Task list refresh after tool call
- [ ] Panel open/close transitions

### Accessibility Tests

- [ ] Keyboard navigation works
- [ ] Screen reader announces messages
- [ ] Focus management on open/close
- [ ] ARIA labels are correct

## Acceptance Criteria

- [ ] Chat panel opens/closes smoothly
- [ ] Messages display with sender distinction
- [ ] Typing indicator shows during AI processing
- [ ] Auto-scroll to new messages
- [ ] Enter sends, Shift+Enter for newline
- [ ] Tool results displayed inline
- [ ] Error messages with retry option
- [ ] Mobile responsive layout
- [ ] Keyboard accessible
- [ ] Screen reader compatible
- [ ] Task list refreshes after tool calls
