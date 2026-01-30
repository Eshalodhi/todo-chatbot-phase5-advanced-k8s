# MCP Tools Specification

**Parent Spec**: [Phase III AI Chatbot](./spec.md)
**Created**: 2026-01-16
**Status**: Draft

## Overview

Five MCP (Model Context Protocol) tools for task management operations. These tools are called by the Cohere AI model to perform actions on the user's tasks.

## Tool Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cohere API Response                       │
│                     (with tool_calls)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Tool Executor                            │
│  - Validates tool name                                       │
│  - Validates parameters                                      │
│  - Injects user_id                                          │
│  - Routes to handler                                         │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │ add_task │       │list_tasks│       │ complete │
    │          │       │          │       │  _task   │
    └──────────┘       └──────────┘       └──────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Existing Task CRUD Layer                       │
│              (from Phase II backend)                         │
└─────────────────────────────────────────────────────────────┘
```

## Tool Definitions

### 1. add_task

**Purpose**: Create a new task for the user

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | The title/description of the task |

**Internal Parameters** (injected by executor):
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | Authenticated user's ID |

**Returns**:
```json
{
  "success": true,
  "message": "Task 'Buy groceries' created successfully",
  "data": {
    "id": "uuid-here",
    "title": "Buy groceries",
    "completed": false,
    "created_at": "2026-01-16T10:00:00Z"
  }
}
```

**Error Cases**:
- Empty title → `{"success": false, "message": "Task title cannot be empty", "data": null}`
- Database error → `{"success": false, "message": "Failed to create task", "data": null}`

---

### 2. list_tasks

**Purpose**: Retrieve user's tasks with optional filtering

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter: "all", "pending", "completed". Default: "all" |

**Internal Parameters** (injected by executor):
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | Authenticated user's ID |

**Returns**:
```json
{
  "success": true,
  "message": "Found 3 tasks",
  "data": {
    "tasks": [
      {"id": "uuid-1", "title": "Buy groceries", "completed": false},
      {"id": "uuid-2", "title": "Call mom", "completed": true},
      {"id": "uuid-3", "title": "Review code", "completed": false}
    ],
    "total": 3,
    "pending": 2,
    "completed": 1
  }
}
```

**Empty List**:
```json
{
  "success": true,
  "message": "No tasks found",
  "data": {
    "tasks": [],
    "total": 0,
    "pending": 0,
    "completed": 0
  }
}
```

---

### 3. complete_task

**Purpose**: Mark a task as completed

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_identifier` | string | Yes | Task title (partial match) or task ID |

**Internal Parameters** (injected by executor):
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | Authenticated user's ID |

**Matching Logic**:
1. Try exact ID match first
2. Then try case-insensitive title contains match
3. If multiple matches, complete the most recent one
4. If no matches, return error

**Returns**:
```json
{
  "success": true,
  "message": "Task 'Buy groceries' marked as completed",
  "data": {
    "id": "uuid-here",
    "title": "Buy groceries",
    "completed": true,
    "completed_at": "2026-01-16T10:30:00Z"
  }
}
```

**Error Cases**:
- Task not found → `{"success": false, "message": "No task matching 'groceries' found", "data": null}`
- Already completed → `{"success": false, "message": "Task 'Buy groceries' is already completed", "data": null}`
- Not user's task → `{"success": false, "message": "Task not found", "data": null}` (don't reveal existence)

---

### 4. delete_task

**Purpose**: Remove a task permanently

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_identifier` | string | Yes | Task title (partial match) or task ID |

**Internal Parameters** (injected by executor):
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | Authenticated user's ID |

**Matching Logic**: Same as complete_task

**Returns**:
```json
{
  "success": true,
  "message": "Task 'Buy groceries' has been deleted",
  "data": {
    "id": "uuid-here",
    "title": "Buy groceries"
  }
}
```

**Error Cases**:
- Task not found → `{"success": false, "message": "No task matching 'groceries' found", "data": null}`
- Not user's task → `{"success": false, "message": "Task not found", "data": null}`

---

### 5. update_task

**Purpose**: Modify a task's title

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `task_identifier` | string | Yes | Task title (partial match) or task ID |
| `new_title` | string | Yes | The new title for the task |

**Internal Parameters** (injected by executor):
| Parameter | Type | Description |
|-----------|------|-------------|
| `user_id` | string | Authenticated user's ID |

**Matching Logic**: Same as complete_task

**Returns**:
```json
{
  "success": true,
  "message": "Task updated from 'Buy groceries' to 'Buy organic groceries'",
  "data": {
    "id": "uuid-here",
    "title": "Buy organic groceries",
    "previous_title": "Buy groceries"
  }
}
```

**Error Cases**:
- Task not found → `{"success": false, "message": "No task matching 'groceries' found", "data": null}`
- Empty new title → `{"success": false, "message": "New title cannot be empty", "data": null}`

## Tool Executor Implementation

### Directory Structure

```
backend/app/
├── services/
│   └── chat/
│       ├── __init__.py
│       ├── tools/
│       │   ├── __init__.py
│       │   ├── base.py           # Base tool class
│       │   ├── executor.py       # Tool routing and execution
│       │   ├── add_task.py
│       │   ├── list_tasks.py
│       │   ├── complete_task.py
│       │   ├── delete_task.py
│       │   └── update_task.py
│       └── definitions.py        # Cohere tool definitions
```

### Base Tool Interface

```python
from abc import ABC, abstractmethod
from typing import Any, Dict
from pydantic import BaseModel

class ToolResult(BaseModel):
    success: bool
    message: str
    data: Any | None = None

class BaseTool(ABC):
    name: str
    description: str

    @abstractmethod
    async def execute(self, user_id: str, **params) -> ToolResult:
        """Execute the tool with given parameters."""
        pass

    @abstractmethod
    def validate_params(self, **params) -> tuple[bool, str | None]:
        """Validate parameters before execution."""
        pass
```

### Tool Executor

```python
from typing import Dict, Type
from .base import BaseTool, ToolResult

class ToolExecutor:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool: BaseTool):
        self._tools[tool.name] = tool

    async def execute(
        self,
        tool_name: str,
        user_id: str,
        parameters: dict
    ) -> ToolResult:
        """Execute a tool by name with user isolation."""

        if tool_name not in self._tools:
            return ToolResult(
                success=False,
                message=f"Unknown tool: {tool_name}"
            )

        tool = self._tools[tool_name]

        # Validate parameters
        is_valid, error = tool.validate_params(**parameters)
        if not is_valid:
            return ToolResult(success=False, message=error)

        # Execute with user_id injected
        try:
            return await tool.execute(user_id=user_id, **parameters)
        except Exception as e:
            return ToolResult(
                success=False,
                message=f"Tool execution failed: {str(e)}"
            )
```

## User Isolation

### Critical Security Requirement

**ALL database queries MUST filter by user_id**

```python
# CORRECT - User isolated
async def get_user_tasks(db: AsyncSession, user_id: str):
    result = await db.execute(
        select(Task).where(Task.user_id == user_id)
    )
    return result.scalars().all()

# WRONG - No user isolation (security vulnerability!)
async def get_tasks(db: AsyncSession):
    result = await db.execute(select(Task))
    return result.scalars().all()
```

### Task Lookup Pattern

```python
async def find_task_by_identifier(
    db: AsyncSession,
    user_id: str,
    identifier: str
) -> Task | None:
    """Find a task by ID or title, scoped to user."""

    # Try UUID match first
    try:
        task_id = UUID(identifier)
        result = await db.execute(
            select(Task)
            .where(Task.id == task_id)
            .where(Task.user_id == user_id)
        )
        task = result.scalar_one_or_none()
        if task:
            return task
    except ValueError:
        pass  # Not a valid UUID, try title match

    # Try case-insensitive title match
    result = await db.execute(
        select(Task)
        .where(Task.user_id == user_id)
        .where(Task.title.ilike(f"%{identifier}%"))
        .order_by(Task.created_at.desc())
    )
    return result.scalar_one_or_none()
```

## Testing Requirements

### Unit Tests (per tool)

- [ ] Successful execution with valid params
- [ ] Validation fails with missing required params
- [ ] Validation fails with invalid param types
- [ ] Database errors are handled gracefully
- [ ] User isolation is enforced

### Integration Tests

- [ ] Tool executor routes to correct handler
- [ ] Unknown tool returns error
- [ ] Multiple sequential tool calls work
- [ ] Concurrent tool calls from same user work
- [ ] Tool results are JSON serializable

### Security Tests

- [ ] User A cannot access User B's tasks
- [ ] SQL injection in task_identifier is prevented
- [ ] Empty user_id fails validation
- [ ] Tool execution logs include user_id for audit

## Acceptance Criteria

- [ ] All 5 tools implemented and registered
- [ ] All tools follow consistent return format
- [ ] User isolation enforced on every database query
- [ ] Parameter validation before execution
- [ ] Graceful error handling with user-friendly messages
- [ ] Task matching works with partial titles
- [ ] Tool definitions match Cohere schema
- [ ] 100% test coverage on tool handlers
