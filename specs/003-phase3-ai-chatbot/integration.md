# Phase II/III Integration Specification

**Parent Spec**: [Phase III AI Chatbot](./spec.md)
**Created**: 2026-01-16
**Status**: Draft

## Overview

This specification defines how Phase III AI Chatbot integrates with the existing Phase II todo application without breaking existing functionality.

## Existing Phase II Components

### Frontend (Next.js)

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/
│   │   └── page.tsx          # Main task list view
│   └── layout.tsx
├── components/
│   ├── ui/                   # shadcn components
│   ├── providers/
│   │   └── auth-provider.tsx # Authentication context
│   └── tasks/
│       ├── TaskList.tsx
│       ├── TaskItem.tsx
│       └── TaskForm.tsx
├── lib/
│   ├── api/
│   │   └── tasks.ts          # Task API client
│   └── auth.ts               # Auth utilities
└── hooks/
    └── useTasks.ts           # Task state management
```

### Backend (FastAPI)

```
backend/
├── app/
│   ├── main.py               # FastAPI app
│   ├── core/
│   │   ├── config.py         # Settings
│   │   └── security.py       # JWT handling
│   ├── models/
│   │   ├── user.py
│   │   └── task.py
│   ├── routers/
│   │   ├── auth.py           # /auth/*
│   │   └── tasks.py          # /api/tasks/*
│   ├── crud/
│   │   └── task.py
│   └── db/
│       └── session.py        # Database connection
└── alembic/
    └── versions/             # Migrations
```

## Integration Points

### 1. Authentication Integration

Phase III uses existing Better Auth JWT system:

```typescript
// Phase III chat uses same auth as Phase II tasks

// frontend/components/chat/hooks/useChatApi.ts
import { getAuthToken } from '@/lib/auth';

async function sendChatMessage(message: string) {
  const token = getAuthToken(); // Reuse existing auth

  const response = await fetch(`/api/${userId}/chat`, {
    headers: {
      'Authorization': `Bearer ${token}` // Same JWT format
    },
    // ...
  });
}
```

**No changes to existing auth system required.**

---

### 2. Task CRUD Integration

Phase III MCP tools use existing Task CRUD operations:

```python
# backend/app/services/chat/tools/add_task.py

from app.crud.task import TaskCRUD  # Reuse existing CRUD
from app.models.task import Task     # Reuse existing model

class AddTaskTool(BaseTool):
    async def execute(self, user_id: str, title: str) -> ToolResult:
        # Use existing CRUD - no duplication
        task = await TaskCRUD.create(
            self.db,
            user_id=user_id,
            title=title
        )
        return ToolResult(
            success=True,
            message=f"Task '{title}' created",
            data=task.dict()
        )
```

**Principle**: Tools wrap existing CRUD, don't duplicate.

---

### 3. Database Integration

Phase III adds new tables alongside existing ones:

```
Existing (Phase II):          New (Phase III):
┌─────────────┐              ┌─────────────────┐
│   users     │──────────────│  conversations  │
├─────────────┤              ├─────────────────┤
│ id          │              │ id              │
│ email       │              │ user_id (FK)    │
│ ...         │              │ created_at      │
└─────────────┘              │ updated_at      │
       │                     └─────────────────┘
       │                            │
       ▼                            ▼
┌─────────────┐              ┌─────────────────┐
│   tasks     │              │    messages     │
├─────────────┤              ├─────────────────┤
│ id          │              │ id              │
│ user_id (FK)│              │ conversation_id │
│ title       │              │ role            │
│ completed   │              │ content         │
│ created_at  │              │ tool_calls      │
└─────────────┘              │ created_at      │
                             └─────────────────┘
```

**Migration Strategy**:
- Additive only (new tables, no modifications to existing)
- Foreign key to existing `users` table
- No changes to `tasks` table structure

---

### 4. Frontend State Sync

When chat tool modifies tasks, frontend task list must refresh:

```typescript
// frontend/components/chat/hooks/useChat.ts

async function handleChatResponse(response: ChatResponse) {
  // Display AI response
  addMessage(response);

  // Check if any tools modified tasks
  const taskModifyingTools = ['add_task', 'complete_task', 'delete_task', 'update_task'];

  const modifiedTasks = response.tool_calls?.some(
    tc => taskModifyingTools.includes(tc.tool) && tc.result.success
  );

  if (modifiedTasks) {
    // Trigger task list refresh
    await refreshTasks();  // From existing useTasks hook
  }
}
```

**Integration with existing useTasks**:

```typescript
// frontend/hooks/useTasks.ts (existing, add refresh trigger)

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Existing fetch logic
  useEffect(() => {
    fetchTasks();
  }, [refreshKey]);

  // Add refresh function for chat integration
  const refreshTasks = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  return { tasks, refreshTasks, /* existing methods */ };
}
```

---

### 5. Router Integration

Add chat router to existing FastAPI app:

```python
# backend/app/main.py

from app.routers import auth, tasks, chat  # Add chat

app = FastAPI(title="TaskFlow API")

# Existing routers
app.include_router(auth.router)
app.include_router(tasks.router)

# Phase III router
app.include_router(chat.router)  # New: /api/{user_id}/chat
```

**URL Structure**:
- Existing: `/api/tasks/*`, `/auth/*`
- New: `/api/{user_id}/chat`, `/api/{user_id}/conversations`

---

### 6. Environment Variables

Phase III adds new env vars without changing existing:

```bash
# backend/.env

# Existing (Phase II)
DATABASE_URL=postgresql://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=...
CORS_ORIGINS=...

# New (Phase III)
COHERE_API_KEY=your_api_key_here
COHERE_MODEL=command-r-plus
COHERE_TEMPERATURE=0.3
```

---

### 7. Frontend Component Integration

Add chat to dashboard layout:

```tsx
// frontend/app/dashboard/layout.tsx

import { ChatPanel } from '@/components/chat';
import { ChatProvider } from '@/components/chat/ChatContext';

export default function DashboardLayout({ children }) {
  return (
    <ChatProvider>
      <div className="flex h-screen">
        {/* Existing sidebar */}
        <Sidebar />

        {/* Main content (tasks) */}
        <main className="flex-1">
          {children}
        </main>

        {/* New: Chat panel */}
        <ChatPanel />
      </div>
    </ChatProvider>
  );
}
```

**Chat Toggle Button** (add to existing header):

```tsx
// frontend/components/layout/Header.tsx

import { ChatToggleButton } from '@/components/chat';

export function Header() {
  return (
    <header className="...">
      {/* Existing header content */}
      <Navigation />
      <UserMenu />

      {/* New: Chat toggle */}
      <ChatToggleButton />
    </header>
  );
}
```

## Backwards Compatibility

### API Compatibility

| Existing Endpoint | Status | Notes |
|-------------------|--------|-------|
| `POST /auth/register` | Unchanged | |
| `POST /auth/login` | Unchanged | |
| `POST /auth/google/callback` | Unchanged | |
| `GET /api/tasks` | Unchanged | |
| `POST /api/tasks` | Unchanged | |
| `PUT /api/tasks/{id}` | Unchanged | |
| `DELETE /api/tasks/{id}` | Unchanged | |

### Database Compatibility

| Table | Status | Notes |
|-------|--------|-------|
| `users` | Unchanged | No schema changes |
| `tasks` | Unchanged | No schema changes |
| `conversations` | New | Added in Phase III |
| `messages` | New | Added in Phase III |

### Frontend Compatibility

| Component | Status | Notes |
|-----------|--------|-------|
| Auth pages | Unchanged | |
| Dashboard | Extended | Chat panel added |
| TaskList | Unchanged | Receives refresh trigger |
| TaskItem | Unchanged | |
| TaskForm | Unchanged | |

## Rollback Strategy

If Phase III causes issues, rollback is straightforward:

1. **Backend**: Remove chat router from `main.py`
2. **Frontend**: Remove ChatPanel from dashboard layout
3. **Database**: Keep tables (no data loss), or drop if needed

```sql
-- Optional: Remove Phase III tables (preserves Phase II)
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
```

## Testing Integration

### Integration Tests

```python
# tests/integration/test_phase2_phase3.py

async def test_existing_task_crud_still_works():
    """Phase II functionality unaffected by Phase III."""
    # Create task via existing API
    task = await client.post("/api/tasks", json={"title": "Test"})
    assert task.status_code == 201

    # Complete via chat
    chat_response = await client.post(
        f"/api/{user_id}/chat",
        json={"message": "Complete the test task"}
    )
    assert chat_response.json()["tool_calls"][0]["result"]["success"]

    # Verify via existing API
    tasks = await client.get("/api/tasks")
    assert tasks.json()[0]["completed"] == True

async def test_chat_uses_same_auth():
    """Chat endpoint uses same JWT as task endpoints."""
    # Get token from existing auth
    token = await login(email, password)

    # Use same token for chat
    response = await client.post(
        f"/api/{user_id}/chat",
        headers={"Authorization": f"Bearer {token}"},
        json={"message": "Hello"}
    )
    assert response.status_code == 200
```

### End-to-End Tests

```typescript
// frontend/e2e/integration.spec.ts

test('task created via chat appears in task list', async ({ page }) => {
  await page.goto('/dashboard');

  // Open chat
  await page.click('[data-testid="chat-toggle"]');

  // Send add task message
  await page.fill('[data-testid="chat-input"]', 'Add task: Buy milk');
  await page.click('[data-testid="chat-send"]');

  // Wait for response
  await page.waitForSelector('text=created');

  // Verify task appears in list
  await expect(page.locator('[data-testid="task-list"]'))
    .toContainText('Buy milk');
});
```

## Deployment Considerations

### Environment Updates

1. Add `COHERE_API_KEY` to production secrets
2. Run database migration for new tables
3. Deploy backend with new router
4. Deploy frontend with chat components

### Feature Flag (Optional)

```python
# backend/app/core/config.py

class Settings:
    # ...
    CHAT_ENABLED: bool = True  # Toggle Phase III

# backend/app/main.py

if settings.CHAT_ENABLED:
    app.include_router(chat.router)
```

```typescript
// frontend/components/chat/ChatPanel.tsx

export function ChatPanel() {
  if (!process.env.NEXT_PUBLIC_CHAT_ENABLED) {
    return null;
  }
  // ...
}
```

## Acceptance Criteria

- [ ] All existing Phase II tests pass
- [ ] Task CRUD works identically
- [ ] Auth system unchanged
- [ ] Chat uses same JWT authentication
- [ ] Tasks created via chat appear in task list
- [ ] Tasks modified via chat update in task list
- [ ] Database migration is additive only
- [ ] Rollback is possible without data loss
- [ ] No breaking changes to existing APIs
