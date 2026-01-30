# Data Model: Frontend UI Implementation

**Feature Branch**: `001-frontend-ui-specs`
**Date**: 2026-01-01
**Status**: Complete

---

## Overview

This document defines the frontend data models (TypeScript interfaces) that map to the backend API contracts. These models are used throughout the frontend for type safety and validation.

---

## Core Entities

### User

Represents the authenticated user context.

```typescript
interface User {
  id: string;           // UUID from Better Auth
  email: string;        // Unique email address
  name: string;         // Display name
}

interface UserSession {
  user: User;
  accessToken: string;  // JWT for API calls
  expiresAt: Date;      // Token expiration
}
```

**Source**: Better Auth session
**Usage**: AuthContext, API requests

---

### Task

Represents a user's task item.

```typescript
interface Task {
  id: number;           // Auto-increment PK
  user_id: string;      // FK to User.id
  title: string;        // Required, 1-200 chars
  description: string | null;  // Optional, max 1000 chars
  completed: boolean;   // Default: false
  created_at: string;   // ISO 8601 datetime
  updated_at: string;   // ISO 8601 datetime
}
```

**Source**: Backend API `/api/{user_id}/tasks`
**Usage**: TaskCard, TaskList, TaskForm

---

## Request/Response DTOs

### CreateTaskRequest

```typescript
interface CreateTaskRequest {
  title: string;        // Required, 1-200 chars
  description?: string; // Optional, max 1000 chars
}
```

**Endpoint**: `POST /api/{user_id}/tasks`

---

### UpdateTaskRequest

```typescript
interface UpdateTaskRequest {
  title: string;        // Required, 1-200 chars
  description?: string; // Optional, max 1000 chars
}
```

**Endpoint**: `PUT /api/{user_id}/tasks/{id}`

---

### TaskListResponse

```typescript
type TaskListResponse = Task[];
```

**Endpoint**: `GET /api/{user_id}/tasks`

---

### TaskResponse

```typescript
type TaskResponse = Task;
```

**Endpoints**:
- `GET /api/{user_id}/tasks/{id}`
- `POST /api/{user_id}/tasks`
- `PUT /api/{user_id}/tasks/{id}`
- `PATCH /api/{user_id}/tasks/{id}/complete`

---

### ErrorResponse

```typescript
interface ErrorResponse {
  detail: string;       // Human-readable error message
}
```

**HTTP Status Codes**:
- 400: Validation error
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (user_id mismatch)
- 404: Task not found
- 500: Server error

---

## Zod Validation Schemas

### TaskSchema

```typescript
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be under 200 characters'),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional()
    .or(z.literal('')),
});

export const updateTaskSchema = createTaskSchema;

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

---

### LoginSchema

```typescript
export const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

---

### RegisterSchema

```typescript
export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;
```

---

## Frontend-Only Models

### Theme

```typescript
type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}
```

---

### Toast

```typescript
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;    // ms, default 5000
}
```

---

### Task Stats

Computed from task list, not persisted.

```typescript
interface TaskStats {
  total: number;
  pending: number;
  completed: number;
}

// Derived from tasks
function computeStats(tasks: Task[]): TaskStats {
  return {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
  };
}
```

---

### Filter State

```typescript
type TaskFilter = 'all' | 'pending' | 'completed';
type TaskSort = 'created_at' | 'title' | 'status';

interface TaskListState {
  filter: TaskFilter;
  sort: TaskSort;
  searchQuery: string;
}
```

---

## State Transitions

### Task Completion

```
PENDING ─── toggle() ───> COMPLETED
    ↑                          │
    └──── toggle() ────────────┘
```

### Authentication

```
UNAUTHENTICATED
      │
      ├── login() ──────> AUTHENTICATED
      │                        │
      └── register() ──> LOGIN_REDIRECT
                               │
                               ├── logout() ──> UNAUTHENTICATED
                               │
                               └── expired ───> SESSION_EXPIRED ──> UNAUTHENTICATED
```

---

## Relationships

```
User (1) ─────────────── (N) Task
  │                           │
  └── id (UUID)               └── user_id (FK)
```

**Frontend Implications**:
- Tasks are always filtered by authenticated user_id
- user_id is extracted from JWT token
- API enforces user isolation (frontend cannot access other users' tasks)

---

## Type Export Index

All types exported from `frontend/types/index.ts`:

```typescript
// Entities
export type { User, UserSession, Task };

// DTOs
export type { CreateTaskRequest, UpdateTaskRequest, TaskListResponse, TaskResponse, ErrorResponse };

// Zod Schemas & Input Types
export { createTaskSchema, updateTaskSchema, loginSchema, registerSchema };
export type { CreateTaskInput, UpdateTaskInput, LoginInput, RegisterInput };

// Frontend Models
export type { Theme, ThemeContextValue, Toast, ToastVariant, TaskStats, TaskFilter, TaskSort, TaskListState };
```
