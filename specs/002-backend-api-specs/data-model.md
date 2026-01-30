# Data Model: Backend API

**Feature**: 002-backend-api-specs
**Date**: 2026-01-05
**Source**: [spec.md](./spec.md), [constitution.md](../../.specify/memory/constitution.md)

## Entity Definitions

### Task Entity

The primary entity for the backend API. Represents a to-do item owned by a user.

```python
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class Task(SQLModel, table=True):
    """
    Task entity stored in Neon PostgreSQL.

    Constraints:
    - user_id is indexed for query performance (FR-006)
    - title is required, 1-200 characters (FR-011)
    - is_completed defaults to false (FR-010)
    - Timestamps auto-managed (FR-008, FR-009)
    """
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)
    title: str = Field(min_length=1, max_length=200, nullable=False)
    description: Optional[str] = Field(default=None)
    is_completed: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
```

### Field Specifications

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | int | PK, auto-increment | SQLModel handles via SERIAL |
| user_id | str | NOT NULL, INDEXED | From JWT 'sub' claim |
| title | str | NOT NULL, 1-200 chars | Pydantic validation |
| description | str | nullable | Optional field |
| is_completed | bool | NOT NULL, default=false | Toggle via PATCH |
| created_at | datetime | NOT NULL, auto-set | Set on INSERT |
| updated_at | datetime | NOT NULL, auto-update | Set on INSERT/UPDATE |

### Indexes

| Index Name | Column(s) | Purpose |
|------------|-----------|---------|
| tasks_pkey | id | Primary key |
| idx_tasks_user_id | user_id | Filter queries by user (user isolation) |

---

## Data Transfer Objects (DTOs)

### CreateTaskDTO

Used for POST /api/{user_id}/tasks requests.

```python
class CreateTaskDTO(SQLModel):
    """Request body for creating a new task."""
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
```

**Validation Rules**:
- `title`: Required, 1-200 characters
- `description`: Optional, no length limit

### UpdateTaskDTO

Used for PATCH /api/{user_id}/tasks/{task_id} requests.

```python
class UpdateTaskDTO(SQLModel):
    """Request body for updating an existing task."""
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    is_completed: Optional[bool] = None
```

**Validation Rules**:
- All fields optional (partial update)
- `title`: If provided, 1-200 characters
- Empty update `{}` is valid (no-op)

### TaskResponse

Used for all Task responses (matches Task entity).

```python
class TaskResponse(SQLModel):
    """Response schema for task endpoints."""
    id: int
    user_id: str
    title: str
    description: Optional[str]
    is_completed: bool
    created_at: datetime
    updated_at: datetime
```

---

## Database Schema (SQL)

### Table Creation

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Performance index for user queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
```

### SQLModel Auto-Creation

SQLModel generates this schema automatically:

```python
from sqlmodel import SQLModel, create_engine

engine = create_engine(DATABASE_URL)
SQLModel.metadata.create_all(engine)  # Called on app startup
```

---

## Entity Relationships

### User (External - Better Auth)

The User entity is managed by Better Auth on the frontend. The backend does NOT store user data directly.

```
User (Better Auth) ──1:N──> Task (Backend)
     ↑                         ↑
     │                         │
  Managed by               Managed by
  Frontend                  Backend
```

**Relationship Enforcement**:
- `tasks.user_id` stores the user identifier from JWT `sub` claim
- No foreign key constraint (users table in different system)
- User isolation enforced at application layer (JWT validation)

---

## State Transitions

### Task Lifecycle

```
[Created] ──PATCH(is_completed=true)──> [Completed]
    ↑                                        │
    │                                        │
    └──PATCH(is_completed=false)─────────────┘

[Any State] ──DELETE──> [Deleted]
```

### Field Update Rules

| Field | Create | Update | Constraints |
|-------|--------|--------|-------------|
| id | auto | never | Immutable |
| user_id | from JWT | never | Immutable, set on create |
| title | required | optional | 1-200 chars |
| description | optional | optional | Nullable |
| is_completed | default false | optional | Toggle allowed |
| created_at | auto | never | Immutable |
| updated_at | auto | auto | Updated on any change |

---

## Validation Rules Summary

### Create Task (FR-011, FR-012)
- `title` MUST be non-empty (min 1 char)
- `title` MUST NOT exceed 200 characters
- `description` MAY be null or omitted

### Update Task
- At least one field SHOULD be provided (empty update is no-op)
- If `title` provided, MUST follow Create rules
- `is_completed` accepts only boolean values

### Query Filtering (FR-004)
- ALL SELECT queries MUST include `WHERE user_id = ?`
- ALL UPDATE queries MUST include `WHERE user_id = ? AND id = ?`
- ALL DELETE queries MUST include `WHERE user_id = ? AND id = ?`

---

## Example Data

### Sample Task (JSON Response)

```json
{
    "id": 1,
    "user_id": "user_abc123",
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "is_completed": false,
    "created_at": "2026-01-05T10:30:00Z",
    "updated_at": "2026-01-05T10:30:00Z"
}
```

### Sample Create Request

```json
{
    "title": "Buy groceries",
    "description": "Milk, eggs, bread"
}
```

### Sample Update Request

```json
{
    "is_completed": true
}
```

Response includes updated `updated_at` timestamp.
