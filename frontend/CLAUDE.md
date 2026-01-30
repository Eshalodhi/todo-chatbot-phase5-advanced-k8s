# Frontend Development Guidelines

**Project**: Phase II/III Todo Application with AI Chatbot
**Stack**: Next.js 16+, TypeScript, Tailwind CSS, Better Auth, Framer Motion
**Updated**: 2026-01-16

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16+ | React framework with App Router |
| TypeScript | 5.x | Type safety (strict mode) |
| Tailwind CSS | 3.x | Utility-first styling |
| Framer Motion | 10+ | Advanced animations |
| Better Auth | Latest | Authentication |
| Lucide React | Latest | Icon library |

### Recommended Additional Libraries

| Library | Purpose |
|---------|---------|
| `react-hot-toast` | Toast notifications |
| `cmdk` | Command palette (Cmd+K) |
| `@radix-ui/react-*` | Headless UI primitives |
| `clsx` + `tailwind-merge` | Conditional class merging |

---

## Project Structure

```
frontend/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth route group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/          # Protected route group
│   │   └── dashboard/
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   └── globals.css           # Global styles
├── components/
│   ├── ui/                   # Atomic components (Button, Input, etc.)
│   ├── features/             # Feature components (TaskCard, TaskList)
│   ├── layout/               # Layout components (Header, Sidebar)
│   └── providers/            # Context providers
├── lib/
│   ├── api.ts                # API client with auth
│   ├── auth.ts               # Better Auth config
│   └── utils.ts              # Utility functions
├── hooks/                    # Custom React hooks
├── types/                    # TypeScript types
└── styles/                   # Additional styles
```

---

## Coding Standards

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Component Patterns

#### Atomic Design Structure

```
Atoms:      Button, Input, Checkbox, Avatar, Badge
Molecules:  TaskCard, FormField, UserMenu
Organisms:  TaskList, Header, Sidebar
Templates:  DashboardLayout, AuthLayout
Pages:      app/(dashboard)/dashboard/page.tsx
```

#### Component File Structure

```tsx
// components/ui/Button.tsx

// 1. Imports
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// 2. Variants definition
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600',
        secondary: 'bg-secondary-500 text-white hover:bg-secondary-600',
        outline: 'border border-primary-500 text-primary-500 hover:bg-primary-50',
        ghost: 'text-neutral-700 hover:bg-neutral-100',
        danger: 'bg-error-500 text-white hover:bg-error-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

// 3. Props interface
interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  iconLeading?: React.ReactNode;
  iconTrailing?: React.ReactNode;
}

// 4. Component with forwardRef
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <Spinner /> : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

---

## Animation Guidelines

### When to Use Each Tool

| Tool | Use For |
|------|---------|
| Tailwind `transition-*` | Simple hover/focus states |
| Framer Motion | Complex animations, gestures, layout changes |
| CSS Keyframes | Infinite animations (spinners, shimmer) |

### Framer Motion Patterns

```tsx
// Page transitions
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

```tsx
// Staggered list animations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

<motion.ul variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.li key={item.id} variants={itemVariants}>
      {item.content}
    </motion.li>
  ))}
</motion.ul>
```

### Performance Rules

1. **Only animate `transform` and `opacity`** (GPU-accelerated)
2. **Avoid animating**: width, height, top, left, margin, padding
3. **Use `layoutId`** for shared element transitions
4. **Use `AnimatePresence`** for exit animations

### Reduced Motion Support

```tsx
// Always provide reduced motion alternatives
import { useReducedMotion } from 'framer-motion';

function AnimatedComponent() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
    >
      Content
    </motion.div>
  );
}
```

---

## Dark Mode Implementation

### Setup

```tsx
// app/layout.tsx
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

```tsx
// components/providers/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: 'system', setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && systemDark);

    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

### Usage in Components

```tsx
// Always use Tailwind dark: variant
<div className="bg-neutral-0 dark:bg-neutral-900">
  <p className="text-neutral-900 dark:text-neutral-100">
    Content
  </p>
</div>
```

### Preventing Flash

```html
<!-- Add to <head> in layout.tsx -->
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = stored === 'dark' || (!stored && prefersDark);
      if (isDark) document.documentElement.classList.add('dark');
    })();
  `
}} />
```

---

## API Integration

### API Client Setup

```tsx
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(response.status, error.message);
    }

    return response.json();
  }

  // Task endpoints
  async getTasks(userId: string) {
    return this.request<Task[]>(`/api/${userId}/tasks`);
  }

  async createTask(userId: string, data: CreateTaskDto) {
    return this.request<Task>(`/api/${userId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(userId: string, taskId: string, data: UpdateTaskDto) {
    return this.request<Task>(`/api/${userId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(userId: string, taskId: string) {
    return this.request<void>(`/api/${userId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
```

---

## Performance Optimization

### Image Optimization

```tsx
// Always use next/image
import Image from 'next/image';

<Image
  src="/hero.png"
  alt="Hero image"
  width={800}
  height={600}
  priority // For above-the-fold images
  placeholder="blur" // If using blurDataURL
/>
```

### Font Optimization

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### Component Lazy Loading

```tsx
// Lazy load below-fold components
import dynamic from 'next/dynamic';

const CommandPalette = dynamic(() => import('@/components/CommandPalette'), {
  loading: () => null,
});

// Only load when needed
const [showPalette, setShowPalette] = useState(false);
{showPalette && <CommandPalette />}
```

### Memoization

```tsx
// Memoize expensive list items
import { memo, useMemo } from 'react';

const TaskCard = memo(function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  return (/* ... */);
});

// Memoize computed values
const completedTasks = useMemo(
  () => tasks.filter(t => t.completed),
  [tasks]
);
```

---

## Accessibility Standards

### Required Practices

1. **Semantic HTML**: Use correct elements (`<button>`, `<nav>`, `<main>`, etc.)
2. **Labels**: All form inputs must have associated `<label>` elements
3. **ARIA**: Use `aria-*` attributes only when semantic HTML isn't sufficient
4. **Focus Management**: Visible focus rings, logical tab order
5. **Color Contrast**: Minimum 4.5:1 for text, 3:1 for UI elements

### Keyboard Navigation

```tsx
// Ensure all interactive elements are keyboard accessible
<button onClick={handleClick} onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleClick();
  }
}}>
  Action
</button>
```

### Screen Reader Support

```tsx
// Use aria-live for dynamic updates
<div role="status" aria-live="polite" aria-atomic="true">
  {message}
</div>

// Use visually hidden text for context
<span className="sr-only">Loading tasks</span>
```

### Focus Trapping (Modals)

```tsx
// Use Radix UI or similar for accessible modals
import * as Dialog from '@radix-ui/react-dialog';

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger asChild>
    <Button>Open Modal</Button>
  </Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <Dialog.Title>Modal Title</Dialog.Title>
      <Dialog.Description>Modal content</Dialog.Description>
      <Dialog.Close asChild>
        <Button>Close</Button>
      </Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

---

## Testing Guidelines

### Unit Tests

- Test component rendering with different props
- Test user interactions (clicks, inputs)
- Test accessibility (labels, roles)

### Integration Tests

- Test full user flows (login, create task)
- Test API error handling
- Test loading and error states

### E2E Tests

- Test critical paths (registration → login → create task)
- Test on multiple viewports
- Test keyboard navigation

---

## Error Handling

### Error Boundary

```tsx
// components/ErrorBoundary.tsx
'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### API Error Handling

```tsx
// Display user-friendly errors
try {
  await api.createTask(userId, data);
  toast.success('Task created');
} catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.message);
  } else {
    toast.error('Something went wrong. Please try again.');
  }
}
```

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Never commit**:
- `.env.local`
- API keys
- Secrets

---

## Git Workflow

1. Create feature branch from `main`
2. Commit with conventional commits: `feat:`, `fix:`, `docs:`, etc.
3. Run lint and tests before pushing
4. Create PR with description of changes
5. Squash and merge after review

---

## Phase III: AI Chat Integration

### Chat Component Structure

```
frontend/components/
├── chat/
│   ├── index.ts              # Barrel exports
│   ├── ChatPanel.tsx         # Main container (collapsible panel)
│   ├── ChatHeader.tsx        # Header with title and controls
│   ├── MessageList.tsx       # Scrollable message container
│   ├── ChatMessage.tsx       # Individual message bubble
│   ├── ChatInput.tsx         # Message input with send
│   ├── TypingIndicator.tsx   # Animated typing dots
│   ├── ToolResult.tsx        # Tool execution result display
│   ├── ChatContext.tsx       # Chat state context
│   └── hooks/
│       ├── useChat.ts        # Chat state management
│       ├── useChatApi.ts     # API communication
│       └── useAutoScroll.ts  # Auto-scroll behavior
```

### Chat State Management

```tsx
// components/chat/ChatContext.tsx

interface ChatState {
  messages: Message[];
  conversationId: string | null;
  isTyping: boolean;
  error: ChatError | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool_calls?: ToolCall[];
  created_at: string;
}

interface ToolCall {
  tool: string;
  parameters: Record<string, any>;
  result: {
    success: boolean;
    message: string;
    data?: any;
  };
}
```

### Chat API Client

```tsx
// lib/api/chat.ts

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
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ message, conversation_id: conversationId })
    });

    if (!response.ok) {
      throw new ChatApiError(await response.json());
    }

    return response.json();
  }
};
```

### Integration with Task List

When chat tools modify tasks, refresh the task list:

```tsx
// components/chat/hooks/useChat.ts

async function handleChatResponse(response: ChatResponse) {
  // Check if any tools modified tasks
  const taskTools = ['add_task', 'complete_task', 'delete_task', 'update_task'];

  const modifiedTasks = response.tool_calls?.some(
    tc => taskTools.includes(tc.tool) && tc.result.success
  );

  if (modifiedTasks) {
    // Refresh task list
    await refreshTasks();  // From existing useTasks hook
  }
}
```

### Dashboard Layout Integration

```tsx
// app/dashboard/layout.tsx

import { ChatPanel } from '@/components/chat';
import { ChatProvider } from '@/components/chat/ChatContext';

export default function DashboardLayout({ children }) {
  return (
    <ChatProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1">{children}</main>
        <ChatPanel />  {/* New: Chat panel */}
      </div>
    </ChatProvider>
  );
}
```

### Chat UI Requirements

| Requirement | Implementation |
|-------------|----------------|
| Collapsible panel | Slide in/out animation |
| Message distinction | User (right, primary), AI (left, secondary) |
| Typing indicator | 3 animated dots during AI processing |
| Auto-scroll | Scroll to bottom on new messages |
| Keyboard shortcuts | Enter to send, Shift+Enter for newline |
| Tool results | Inline display with success/failure indicator |
| Error handling | Show error with retry button |
| Mobile responsive | Full-screen on mobile, panel on desktop |

### Accessibility for Chat

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
```

### Chat Animations

```tsx
// Message appearance animation
const messageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

<motion.div
  variants={messageVariants}
  initial="hidden"
  animate="visible"
  transition={{ duration: 0.2 }}
>
  <ChatMessage message={msg} />
</motion.div>
```

### Environment Variables (Phase III)

```env
# .env.local

# Existing
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Phase III - Enable chat feature
NEXT_PUBLIC_CHAT_ENABLED=true
```
