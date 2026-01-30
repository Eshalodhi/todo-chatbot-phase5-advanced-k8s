# Data Model: Phase V Advanced Cloud Deployment

**Date**: 2026-01-28
**Status**: Complete
**Plan**: [plan.md](./plan.md)

## Overview

This document defines the extended data model for Phase V, including new entities (Reminder, Tag, TaskTag, ProcessedEvent) and extensions to the existing Task model.

## Entity Relationship Diagram

```
┌─────────────────┐         ┌─────────────────┐
│      User       │         │   Conversation  │
│  (Better Auth)  │◄────────│                 │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ 1:N                       │ 1:N
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│      Task       │         │     Message     │
│   (Extended)    │         │                 │
└────────┬────────┘         └─────────────────┘
         │
    ┌────┼────┬────────────┐
    │    │    │            │
    │ 1:N│    │ N:M        │ 1:N
    ▼    │    ▼            ▼
┌────────┴──┐ ┌──────┐ ┌─────────────────┐
│ Reminder  │ │TaskTag│ │ ProcessedEvent  │
└───────────┘ └───┬──┘ └─────────────────┘
                  │
                  │ N:1
                  ▼
              ┌──────┐
              │  Tag │
              └──────┘
```

## Extended Entities

### Task (Extended)

Existing Task model with new fields for Phase V features.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | Integer | PK, auto-increment | Unique identifier |
| user_id | String | FK → users.id, NOT NULL, INDEXED | Owner reference |
| title | String(200) | NOT NULL | Task title (1-200 chars) |
| description | Text | NULLABLE | Task details (max 1000 chars) |
| completed | Boolean | DEFAULT false, INDEXED | Completion status |
| **due_date** | DateTime | NULLABLE, INDEXED | **NEW**: When task is due (UTC) |
| **priority** | String(10) | DEFAULT 'medium', INDEXED | **NEW**: low/medium/high |
| **recurrence_pattern** | String(20) | NULLABLE | **NEW**: daily/weekly/monthly |
| **recurrence_end_date** | DateTime | NULLABLE | **NEW**: When recurrence stops |
| created_at | DateTime | DEFAULT now() | Creation timestamp |
| updated_at | DateTime | DEFAULT now(), ON UPDATE | Last modification |

**Validation Rules**:
- `title`: 1-200 characters, required
- `description`: max 1000 characters, optional
- `priority`: enum ('low', 'medium', 'high'), default 'medium'
- `recurrence_pattern`: enum ('daily', 'weekly', 'monthly') or null
- `due_date`: must be valid ISO-8601 datetime if provided
- `recurrence_end_date`: must be >= due_date if provided

**Indexes**:
- `idx_tasks_user_id` on (user_id)
- `idx_tasks_completed` on (completed)
- `idx_tasks_due_date` on (due_date) - **NEW**
- `idx_tasks_priority` on (priority) - **NEW**
- `idx_tasks_user_due` on (user_id, due_date) - **NEW** composite

---

### Reminder (NEW)

Stores scheduled reminders for tasks.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | Integer | PK, auto-increment | Unique identifier |
| task_id | Integer | FK → tasks.id, NOT NULL, INDEXED | Associated task |
| user_id | String | FK → users.id, NOT NULL, INDEXED | Owner reference |
| remind_at | DateTime | NOT NULL, INDEXED | When to send reminder (UTC) |
| sent | Boolean | DEFAULT false, INDEXED | Whether notification sent |
| sent_at | DateTime | NULLABLE | When notification was sent |
| retry_count | Integer | DEFAULT 0 | Number of send attempts |
| created_at | DateTime | DEFAULT now() | Creation timestamp |
| updated_at | DateTime | DEFAULT now(), ON UPDATE | Last modification |

**Validation Rules**:
- `remind_at`: must be valid future datetime
- `retry_count`: max 3 (after 3 failures, stops trying)
- One active reminder per task (soft constraint via application logic)

**Indexes**:
- `idx_reminders_task_id` on (task_id)
- `idx_reminders_user_id` on (user_id)
- `idx_reminders_remind_at` on (remind_at)
- `idx_reminders_pending` on (sent, remind_at) - for scheduled job query

**Foreign Keys**:
- `task_id` → `tasks.id` ON DELETE CASCADE
- `user_id` → `users.id` ON DELETE CASCADE

---

### Tag (NEW)

User-scoped tags for categorizing tasks.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | Integer | PK, auto-increment | Unique identifier |
| user_id | String | FK → users.id, NOT NULL, INDEXED | Owner reference |
| name | String(50) | NOT NULL | Tag name |
| color | String(7) | NULLABLE | Hex color code (#RRGGBB) |
| created_at | DateTime | DEFAULT now() | Creation timestamp |

**Validation Rules**:
- `name`: 1-50 characters, alphanumeric, hyphens, underscores only
- `color`: valid hex color or null
- Unique constraint on (user_id, name) - each user has unique tag names

**Indexes**:
- `idx_tags_user_id` on (user_id)
- `idx_tags_user_name` on (user_id, name) UNIQUE

**Foreign Keys**:
- `user_id` → `users.id` ON DELETE CASCADE

---

### TaskTag (NEW)

Join table for many-to-many relationship between tasks and tags.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | Integer | PK, auto-increment | Unique identifier |
| task_id | Integer | FK → tasks.id, NOT NULL, INDEXED | Associated task |
| tag_id | Integer | FK → tags.id, NOT NULL, INDEXED | Associated tag |
| created_at | DateTime | DEFAULT now() | When tag was added |

**Validation Rules**:
- Unique constraint on (task_id, tag_id) - no duplicate tag assignments
- Max 20 tags per task (application-level constraint)

**Indexes**:
- `idx_task_tags_task_id` on (task_id)
- `idx_task_tags_tag_id` on (tag_id)
- `idx_task_tags_unique` on (task_id, tag_id) UNIQUE

**Foreign Keys**:
- `task_id` → `tasks.id` ON DELETE CASCADE
- `tag_id` → `tags.id` ON DELETE CASCADE

---

### ProcessedEvent (NEW)

Tracks processed events for idempotency across microservices.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | Integer | PK, auto-increment | Unique identifier |
| event_id | String(36) | NOT NULL, UNIQUE, INDEXED | UUID of processed event |
| event_type | String(50) | NOT NULL | Type of event |
| service_name | String(50) | NOT NULL | Service that processed it |
| processed_at | DateTime | DEFAULT now() | When event was processed |

**Validation Rules**:
- `event_id`: valid UUID format
- Unique constraint on (event_id, service_name) - same event can be processed by multiple services

**Indexes**:
- `idx_processed_events_event_id` on (event_id)
- `idx_processed_events_service` on (event_id, service_name) UNIQUE

**Retention Policy**:
- Records older than 30 days can be deleted (cleanup job)

---

## SQLModel Definitions

### Task (Extended)

```python
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class RecurrencePattern(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"

class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    title: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    completed: bool = Field(default=False, index=True)

    # Phase V additions
    due_date: Optional[datetime] = Field(default=None, index=True)
    priority: Priority = Field(default=Priority.MEDIUM, index=True)
    recurrence_pattern: Optional[RecurrencePattern] = Field(default=None)
    recurrence_end_date: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### Reminder

```python
class Reminder(SQLModel, table=True):
    __tablename__ = "reminders"

    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="tasks.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    remind_at: datetime = Field(index=True)
    sent: bool = Field(default=False, index=True)
    sent_at: Optional[datetime] = Field(default=None)
    retry_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

### Tag

```python
class Tag(SQLModel, table=True):
    __tablename__ = "tags"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    name: str = Field(max_length=50)
    color: Optional[str] = Field(default=None, max_length=7)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        # Unique constraint on (user_id, name)
        table_args = (UniqueConstraint("user_id", "name"),)
```

### TaskTag

```python
class TaskTag(SQLModel, table=True):
    __tablename__ = "task_tags"

    id: Optional[int] = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="tasks.id", index=True)
    tag_id: int = Field(foreign_key="tags.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        table_args = (UniqueConstraint("task_id", "tag_id"),)
```

### ProcessedEvent

```python
class ProcessedEvent(SQLModel, table=True):
    __tablename__ = "processed_events"

    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: str = Field(max_length=36, index=True)
    event_type: str = Field(max_length=50)
    service_name: str = Field(max_length=50)
    processed_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        table_args = (UniqueConstraint("event_id", "service_name"),)
```

---

## Migration Script

```sql
-- Phase V Database Migration

-- Extend tasks table
ALTER TABLE tasks
ADD COLUMN due_date TIMESTAMP NULL,
ADD COLUMN priority VARCHAR(10) DEFAULT 'medium' NOT NULL,
ADD COLUMN recurrence_pattern VARCHAR(20) NULL,
ADD COLUMN recurrence_end_date TIMESTAMP NULL;

CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date);

-- Create reminders table
CREATE TABLE reminders (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remind_at TIMESTAMP NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reminders_task_id ON reminders(task_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX idx_reminders_pending ON reminders(sent, remind_at);

-- Create tags table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE INDEX idx_tags_user_id ON tags(user_id);

-- Create task_tags join table
CREATE TABLE task_tags (
    id SERIAL PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, tag_id)
);

CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag_id ON task_tags(tag_id);

-- Create processed_events table (for idempotency)
CREATE TABLE processed_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    service_name VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, service_name)
);

CREATE INDEX idx_processed_events_event_id ON processed_events(event_id);
```

---

## State Transitions

### Task Completion with Recurrence

```
Task (recurring, not completed)
    │
    ├── User completes task
    │
    ▼
Task (completed = true)
    │
    ├── Event published: task.completed
    │
    ▼
Recurring Task Service
    │
    ├── Calculate next due_date
    │
    ▼
New Task created
    │
    ├── Same title, description, priority, tags
    ├── New due_date (calculated)
    ├── completed = false
    │
    ▼
Event published: recurring.task.created
```

### Reminder Lifecycle

```
Reminder (created)
    │ sent=false, retry_count=0
    │
    ├── Scheduled time arrives
    │
    ▼
Reminder (triggering)
    │
    ├── Event: reminder.triggered
    │
    ▼
Notification Service
    │
    ├─── Success ──────────────────────┐
    │                                   │
    ├─── Failure (retry_count < 3) ───┐│
    │    └── Increment retry_count    ││
    │    └── Schedule retry           ││
    │                                  ││
    ├─── Failure (retry_count >= 3) ──┼┤
    │    └── Route to DLQ             ││
    │                                  ▼▼
    ▼                        Reminder (sent=true)
                                 sent_at = now
```

---

## Query Patterns

### List Tasks with Filters

```sql
-- Get tasks for user with optional filters
SELECT t.*,
       array_agg(tag.name) as tag_names
FROM tasks t
LEFT JOIN task_tags tt ON t.id = tt.task_id
LEFT JOIN tags tag ON tt.tag_id = tag.id
WHERE t.user_id = :user_id
  AND (:status IS NULL OR
       (t.completed = (:status = 'completed')))
  AND (:priority IS NULL OR t.priority = :priority)
  AND (:due_before IS NULL OR t.due_date <= :due_before)
  AND (:tag_ids IS NULL OR tag.id = ANY(:tag_ids))
GROUP BY t.id
ORDER BY
  CASE WHEN :sort = 'due_date' THEN t.due_date END ASC,
  CASE WHEN :sort = 'priority' THEN
    CASE t.priority
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END
  END ASC,
  t.created_at DESC;
```

### Get Pending Reminders

```sql
-- Used by scheduled job every minute
SELECT r.*, t.title as task_title, t.due_date
FROM reminders r
JOIN tasks t ON r.task_id = t.id
WHERE r.sent = FALSE
  AND r.remind_at <= NOW()
  AND r.retry_count < 3
ORDER BY r.remind_at ASC;
```

### Check Idempotency

```sql
-- Check if event already processed
SELECT 1 FROM processed_events
WHERE event_id = :event_id
  AND service_name = :service_name;
```
