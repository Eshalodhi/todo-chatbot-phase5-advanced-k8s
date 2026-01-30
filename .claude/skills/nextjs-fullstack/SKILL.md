# Next.js 16+ Full-Stack Development Skill

## Purpose

Guide for building Next.js 16+ applications with App Router, Server Components, Client Components, and Better Auth integration for Phase II hackathon.

## Technology Stack

- **Next.js 16+** - App Router architecture
- **TypeScript** - Strict mode enabled
- **React 18+** - Server + Client Components
- **Better Auth** - Authentication system
- **Tailwind CSS** - Utility-first styling

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx              # Root layout (Server Component)
│   ├── page.tsx                # Home page (/)
│   ├── globals.css             # Global styles + Tailwind imports
│   ├── (auth)/                 # Route group (no URL segment)
│   │   ├── login/
│   │   │   └── page.tsx        # /login
│   │   └── register/
│   │       └── page.tsx        # /register
│   ├── dashboard/
│   │   ├── layout.tsx          # Dashboard layout
│   │   └── page.tsx            # /dashboard
│   ├── tasks/
│   │   ├── page.tsx            # /tasks (list)
│   │   ├── [id]/
│   │   │   └── page.tsx        # /tasks/123 (detail)
│   │   └── new/
│   │       └── page.tsx        # /tasks/new (create)
│   └── api/
│       └── auth/
│           └── [...all]/
│               └── route.ts    # Better Auth API routes
├── components/
│   ├── ui/                     # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   ├── forms/                  # Form components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── TaskForm.tsx
│   ├── layout/                 # Layout components
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   └── tasks/                  # Feature-specific components
│       ├── TaskList.tsx
│       ├── TaskItem.tsx
│       └── TaskCard.tsx
├── lib/
│   ├── api.ts                  # API client with JWT
│   ├── auth.ts                 # Better Auth client
│   ├── auth-client.ts          # Client-side auth utilities
│   └── utils.ts                # Helper functions
├── types/
│   ├── index.ts                # Type exports
│   ├── task.ts                 # Task interfaces
│   ├── user.ts                 # User interfaces
│   └── api.ts                  # API response types
├── middleware.ts               # Route protection
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── .env.local                  # Environment variables
```

---

## File-Based Routing

Next.js App Router uses the filesystem for routing:

| File Path | URL | Description |
|-----------|-----|-------------|
| `app/page.tsx` | `/` | Home page |
| `app/about/page.tsx` | `/about` | About page |
| `app/dashboard/page.tsx` | `/dashboard` | Dashboard |
| `app/(auth)/login/page.tsx` | `/login` | Login (route group) |
| `app/(auth)/register/page.tsx` | `/register` | Register (route group) |
| `app/tasks/page.tsx` | `/tasks` | Task list |
| `app/tasks/[id]/page.tsx` | `/tasks/123` | Dynamic task detail |
| `app/tasks/new/page.tsx` | `/tasks/new` | Create task |

### Route Groups

Route groups use parentheses `()` to organize routes without affecting the URL:

```tsx
// app/(auth)/login/page.tsx → /login (not /(auth)/login)
// app/(auth)/register/page.tsx → /register
```

### Dynamic Routes

Use brackets `[]` for dynamic segments:

```tsx
// app/tasks/[id]/page.tsx
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  // Fetch task with id
  return <div>Task {id}</div>;
}
```

---

## Server vs Client Components

### Server Components (Default)

Server Components run on the server and are the default in App Router.

**When to use:**
- Data fetching from database or API
- Accessing backend resources
- Keeping sensitive information on server
- Large dependencies that shouldn't be sent to client
- Static content rendering

**Features:**
- Can use `async/await` directly
- No `useState`, `useEffect`, or other hooks
- No event handlers (`onClick`, `onChange`)
- Can import server-only code

```tsx
// app/tasks/page.tsx (Server Component - default)
import { api } from "@/lib/api";
import { Task } from "@/types";
import TaskList from "@/components/tasks/TaskList";

export default async function TasksPage() {
  // Direct async data fetching
  const tasks: Task[] = await api.get("/tasks");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Tasks</h1>
      <TaskList tasks={tasks} />
    </div>
  );
}
```

### Client Components ('use client')

Client Components run in the browser and enable interactivity.

**When to use:**
- User interactions (clicks, form inputs)
- React hooks (`useState`, `useEffect`, `useContext`)
- Browser APIs (`localStorage`, `window`)
- Event listeners
- Real-time updates

**Features:**
- Must add `'use client'` directive at top
- Can use all React hooks
- Can handle DOM events
- Hydrated on client

```tsx
// components/tasks/TaskForm.tsx (Client Component)
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

interface TaskFormProps {
  initialData?: {
    title: string;
    description: string;
  };
  taskId?: string;
}

export default function TaskForm({ initialData, taskId }: TaskFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (taskId) {
        await api.put(`/tasks/${taskId}`, { title, description });
      } else {
        await api.post("/tasks", { title, description });
      }
      router.push("/tasks");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md">{error}</div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? "Saving..." : taskId ? "Update Task" : "Create Task"}
      </button>
    </form>
  );
}
```

### Composition Pattern

Combine Server and Client Components effectively:

```tsx
// app/tasks/page.tsx (Server Component)
import { api } from "@/lib/api";
import TaskListClient from "@/components/tasks/TaskListClient";

export default async function TasksPage() {
  // Fetch on server
  const tasks = await api.get("/tasks");

  // Pass to client component for interactivity
  return <TaskListClient initialTasks={tasks} />;
}
```

```tsx
// components/tasks/TaskListClient.tsx (Client Component)
"use client";

import { useState } from "react";
import { Task } from "@/types";

interface TaskListClientProps {
  initialTasks: Task[];
}

export default function TaskListClient({ initialTasks }: TaskListClientProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [filter, setFilter] = useState<"all" | "completed" | "pending">("all");

  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.completed;
    if (filter === "pending") return !task.completed;
    return true;
  });

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("all")}
          className={filter === "all" ? "font-bold" : ""}
        >
          All
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={filter === "completed" ? "font-bold" : ""}
        >
          Completed
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={filter === "pending" ? "font-bold" : ""}
        >
          Pending
        </button>
      </div>

      <ul className="space-y-2">
        {filteredTasks.map((task) => (
          <li key={task.id} className="p-4 border rounded-md">
            {task.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## TypeScript Patterns

### Type Definitions

```tsx
// types/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserCreateInput {
  email: string;
  password: string;
  name: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}
```

```tsx
// types/task.ts
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  completed: boolean;
  priority: TaskPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = "low" | "medium" | "high";

export interface TaskCreateInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  due_date?: string;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TaskPriority;
  due_date?: string;
}
```

```tsx
// types/api.ts
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  detail?: string;
  status_code: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
```

```tsx
// types/index.ts
export * from "./user";
export * from "./task";
export * from "./api";
```

### Component Props Typing

```tsx
// components/ui/Button.tsx
"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = "font-medium rounded-md transition-colors focus:outline-none focus:ring-2";

  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "bg-transparent hover:bg-gray-100 focus:ring-gray-500",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className} ${
        disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""
      }`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
}
```

---

## API Client Pattern

Complete API client with JWT authentication:

```tsx
// lib/api.ts
import { authClient } from "./auth-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const session = await authClient.getSession();
      return session?.session?.token ?? null;
    } catch {
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { skipAuth = false, headers: customHeaders, ...fetchOptions } = options;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    // Attach JWT token if available and not skipping auth
    if (!skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized");
      }

      // Handle 403 Forbidden
      if (response.status === 403) {
        throw new Error("Forbidden: You do not have access to this resource");
      }

      // Handle 404 Not Found
      if (response.status === 404) {
        throw new Error("Resource not found");
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Network error occurred");
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const api = new ApiClient(API_BASE_URL);
```

### Usage Examples

```tsx
// In a Server Component
import { api } from "@/lib/api";
import { Task } from "@/types";

export default async function TasksPage() {
  const tasks = await api.get<Task[]>("/api/tasks");
  return <TaskList tasks={tasks} />;
}

// In a Client Component
"use client";

import { api } from "@/lib/api";
import { Task, TaskCreateInput } from "@/types";

const handleCreateTask = async (data: TaskCreateInput) => {
  const newTask = await api.post<Task>("/api/tasks", data);
  console.log("Created task:", newTask);
};

const handleUpdateTask = async (id: string, data: Partial<Task>) => {
  const updated = await api.patch<Task>(`/api/tasks/${id}`, data);
  console.log("Updated task:", updated);
};

const handleDeleteTask = async (id: string) => {
  await api.delete(`/api/tasks/${id}`);
  console.log("Deleted task");
};
```

---

## Better Auth Integration

### Server-Side Auth Configuration

```tsx
// lib/auth.ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ],
});
```

### Client-Side Auth

```tsx
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
```

### Auth API Route Handler

```tsx
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### Login Form Component

```tsx
// components/forms/LoginForm.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid credentials");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center">Sign In</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link href="/register" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
```

---

## Middleware for Protected Routes

```tsx
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/tasks", "/settings"];

// Routes only for unauthenticated users
const authRoutes = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get session token from cookies (Better Auth uses this cookie name)
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;
  const isAuthenticated = !!sessionToken;

  // Check if accessing a protected route without auth
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check if accessing auth routes while already authenticated
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};
```

---

## Tailwind CSS Responsive Design

### Breakpoints

| Prefix | Min Width | CSS |
|--------|-----------|-----|
| `sm` | 640px | `@media (min-width: 640px)` |
| `md` | 768px | `@media (min-width: 768px)` |
| `lg` | 1024px | `@media (min-width: 1024px)` |
| `xl` | 1280px | `@media (min-width: 1280px)` |
| `2xl` | 1536px | `@media (min-width: 1536px)` |

### Mobile-First Examples

```tsx
// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {tasks.map((task) => (
    <TaskCard key={task.id} task={task} />
  ))}
</div>

// Responsive typography
<h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">
  Dashboard
</h1>

// Responsive spacing
<div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
  {/* Content */}
</div>

// Responsive flexbox
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <h2 className="text-xl font-semibold">Tasks</h2>
  <button className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md">
    Add Task
  </button>
</div>

// Hide/show at breakpoints
<nav className="hidden md:flex items-center gap-4">
  {/* Desktop navigation */}
</nav>
<button className="md:hidden">
  {/* Mobile menu button */}
</button>
```

### Common Responsive Patterns

```tsx
// Responsive card component
export function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-medium truncate">
            {task.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
            {task.description}
          </p>
        </div>
        <span
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
            task.completed
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {task.completed ? "Done" : "Pending"}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">
          Edit
        </button>
        <button className="flex-1 sm:flex-none px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-md hover:bg-red-50">
          Delete
        </button>
      </div>
    </div>
  );
}

// Responsive layout
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <span className="text-lg sm:text-xl font-bold">TaskApp</span>
            <nav className="hidden sm:flex items-center gap-4">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </a>
              <a href="/tasks" className="text-gray-600 hover:text-gray-900">
                Tasks
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
```

---

## Environment Variables

### Required Variables

```bash
# .env.local

# API URL (FastAPI backend)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Better Auth Configuration
BETTER_AUTH_SECRET=your-secret-key-min-32-chars-here
BETTER_AUTH_URL=http://localhost:3000

# Database (for Better Auth)
DATABASE_URL=postgresql://user:password@host:5432/database

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Accessing Environment Variables

```tsx
// Client-side (must be prefixed with NEXT_PUBLIC_)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Server-side only
const dbUrl = process.env.DATABASE_URL;
const authSecret = process.env.BETTER_AUTH_SECRET;
```

---

## Best Practices

### 1. Server Components by Default

Always start with Server Components. Only add `'use client'` when you need:
- Event handlers (`onClick`, `onChange`)
- React hooks (`useState`, `useEffect`)
- Browser APIs

### 2. Type Everything with TypeScript

```tsx
// Always define interfaces for component props
interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

// Type API responses
const tasks = await api.get<Task[]>("/tasks");

// Type form data
const [formData, setFormData] = useState<TaskCreateInput>({
  title: "",
  description: "",
});
```

### 3. Centralize API Calls

Keep all API logic in `lib/api.ts` for:
- Consistent error handling
- Automatic token attachment
- Type safety
- Easy testing

### 4. Handle Loading and Error States

```tsx
"use client";

import { useState, useEffect } from "react";

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      try {
        const data = await api.get<Task[]>("/tasks");
        setTasks(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setIsLoading(false);
      }
    }
    fetchTasks();
  }, []);

  if (isLoading) {
    return <div className="animate-pulse">Loading tasks...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return <ul>{/* render tasks */}</ul>;
}
```

### 5. Mobile-First Responsive Design

Always design for mobile first, then add responsive modifiers:

```tsx
// Mobile first: single column
// sm: two columns
// lg: three columns
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

### 6. Use Route Groups for Organization

```
app/
├── (auth)/           # Authentication routes (no /auth in URL)
│   ├── login/
│   └── register/
├── (dashboard)/      # Dashboard routes
│   ├── layout.tsx    # Shared dashboard layout
│   ├── page.tsx
│   └── settings/
└── (marketing)/      # Public marketing pages
    ├── about/
    └── pricing/
```

### 7. Implement Proper Error Boundaries

```tsx
// app/error.tsx
"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
```

### 8. Use Loading States with Suspense

```tsx
// app/tasks/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-20 bg-gray-200 rounded-md animate-pulse"
        />
      ))}
    </div>
  );
}
```

---

## Quick Reference

### File Naming Conventions

| File | Purpose |
|------|---------|
| `page.tsx` | Route page component |
| `layout.tsx` | Shared layout wrapper |
| `loading.tsx` | Loading UI (Suspense fallback) |
| `error.tsx` | Error boundary |
| `not-found.tsx` | 404 page |
| `route.ts` | API route handler |

### Common Imports

```tsx
// Next.js
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";

// Client-side navigation
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// React
import { useState, useEffect, useCallback, useMemo } from "react";
```
