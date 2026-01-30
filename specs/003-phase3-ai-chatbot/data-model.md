# Data Model: Phase III AI Chatbot

**Feature Branch**: `003-phase3-ai-chatbot`
**Created**: 2026-01-17
**Status**: Complete

## Overview

This document defines the database schema additions for Phase III AI chatbot integration. These models extend the existing Phase II schema without breaking changes.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXISTING (Phase II)                          │
│                                                                      │
│   ┌─────────────┐           ┌─────────────┐                         │
│   │    users    │◄──────────│    tasks    │                         │
│   │             │  1:N      │             │                         │
│   │  id (PK)    │           │  id (PK)    │                         │
│   │  email      │           │  user_id(FK)│                         │
│   │  name       │           │  title      │                         │
│   │  password_  │           │  description│                         │
│   │    hash     │           │  is_complete│                         │
│   │  created_at │           │  created_at │                         │
│   └──────┬──────┘           │  updated_at │                         │
│          │                  └─────────────┘                         │
└──────────┼──────────────────────────────────────────────────────────┘
           │
           │
┌──────────┼──────────────────────────────────────────────────────────┐
│          │                  NEW (Phase III)                          │
│          │                                                           │
│          │  1:N      ┌────────────────┐                             │
│          └──────────►│  conversations │                             │
│                      │                │                             │
│                      │  id (PK)       │                             │
│                      │  user_id (FK)  │◄──────────┐                 │
│                      │  title         │           │                 │
│                      │  created_at    │           │ 1:N             │
│                      │  updated_at    │           │                 │
│                      └────────┬───────┘           │                 │
│                               │                   │                 │
│                               │ 1:N               │                 │
│                               ▼                   │                 │
│                      ┌────────────────┐           │                 │
│                      │    messages    │───────────┘                 │
│                      │                │                             │
│                      │  id (PK)       │                             │
│                      │  conversation_ │                             │
│                      │    id (FK)     │                             │
│                      │  user_id (FK)  │  ◄── For user isolation     │
│                      │  role          │                             │
│                      │  content       │                             │
│                      │  tool_calls    │                             │
│                      │  tool_call_id  │                             │
│                      │  created_at    │                             │
│                      └────────────────┘                             │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Entity Definitions

### Conversation

Represents a chat session between a user and the AI assistant.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto-increment | Unique conversation identifier |
| `user_id` | String | FK → users.id, INDEXED, NOT NULL | Owner of the conversation |
| `title` | String | Max 200 chars, Nullable | Optional conversation title (auto-generated from first message) |
| `created_at` | DateTime | NOT NULL, Default: UTC now | When conversation started |
| `updated_at` | DateTime | NOT NULL, Default: UTC now | Last activity timestamp |

**Indexes**:
- `idx_conversations_user_id` on `user_id` - Required for user isolation queries

**Relationships**:
- Belongs to: User (many-to-one)
- Has many: Messages (one-to-many, cascade delete)

**SQLModel Definition**:

```python
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class Conversation(SQLModel, table=True):
    """Chat conversation entity stored in Neon PostgreSQL."""

    __tablename__ = "conversations"

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, foreign_key="users.id")
    title: str | None = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Relationships
    messages: List["Message"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
```

---

### Message

Represents a single message within a conversation.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Integer | PK, Auto-increment | Unique message identifier |
| `conversation_id` | Integer | FK → conversations.id, INDEXED, NOT NULL | Parent conversation |
| `user_id` | String | FK → users.id, INDEXED, NOT NULL | Message owner (for isolation) |
| `role` | String | ENUM("user", "assistant", "tool"), NOT NULL | Message sender role |
| `content` | Text | NOT NULL | Message content or tool result |
| `tool_calls` | JSON | Nullable | Cohere tool_calls data (for assistant messages) |
| `tool_call_id` | String | Nullable, Max 100 chars | Tool call ID (for tool role messages) |
| `created_at` | DateTime | NOT NULL, Default: UTC now | When message was created |

**Indexes**:
- `idx_messages_conversation_id` on `conversation_id` - Required for history queries
- `idx_messages_user_id` on `user_id` - Required for user isolation
- `idx_messages_created_at` on `created_at` - For ordering messages

**Relationships**:
- Belongs to: Conversation (many-to-one)
- Belongs to: User (many-to-one, for isolation only)

**SQLModel Definition**:

```python
from datetime import datetime, timezone
from typing import Optional, Any
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy import Text, JSON

class Message(SQLModel, table=True):
    """Chat message entity stored in Neon PostgreSQL."""

    __tablename__ = "messages"

    id: int | None = Field(default=None, primary_key=True)
    conversation_id: int = Field(index=True, foreign_key="conversations.id")
    user_id: str = Field(index=True, foreign_key="users.id")
    role: str = Field(max_length=20)  # "user", "assistant", "tool"
    content: str = Field(sa_column=Column(Text, nullable=False))
    tool_calls: dict | None = Field(default=None, sa_column=Column(JSON))
    tool_call_id: str | None = Field(default=None, max_length=100)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True
    )

    # Relationships
    conversation: Optional["Conversation"] = Relationship(back_populates="messages")
```

---

## Validation Rules

### Conversation

| Rule | Implementation |
|------|----------------|
| `user_id` must be valid | Foreign key constraint to users table |
| `title` max length | 200 characters (optional field) |
| `user_id` required | NOT NULL constraint |

### Message

| Rule | Implementation |
|------|----------------|
| `role` valid values | Application-level enum validation: "user", "assistant", "tool" |
| `content` required | NOT NULL constraint, minimum 1 character |
| `conversation_id` valid | Foreign key constraint |
| `user_id` required | NOT NULL constraint (for user isolation queries) |
| `tool_calls` format | JSON object when present (Cohere tool_calls format) |
| `tool_call_id` format | String matching Cohere tool call ID format |

---

## State Transitions

### Conversation States

```
┌─────────────┐     Create      ┌─────────────┐
│   (none)    │ ───────────────►│   Active    │
└─────────────┘                 └──────┬──────┘
                                       │
                               New message
                                       │
                                       ▼
                                ┌─────────────┐
                                │   Active    │ (updated_at refreshed)
                                └─────────────┘
```

Conversations do not have explicit states - they are simply active containers for messages. The `updated_at` timestamp tracks last activity.

### Message Processing Flow

```
User Input    ──────►   Message(role="user")
                              │
                              ▼
                        Cohere API Call
                              │
              ┌───────────────┼───────────────┐
              │               │               │
        No tool calls   Tool calls      Error
              │               │               │
              ▼               ▼               ▼
     Message(role=      Execute tools   Handle error
     "assistant")             │          gracefully
                              │
                              ▼
                     Message(role="tool")
                       for each result
                              │
                              ▼
                        Cohere API Call
                        (with tool results)
                              │
                              ▼
                     Message(role="assistant")
                        (final response)
```

---

## Migration Script

```sql
-- Phase III Migration: Add Conversation and Message tables
-- Run AFTER Phase II is stable

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for user isolation
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_call_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Update trigger for conversations.updated_at
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();
```

---

## Query Patterns

### Load Conversation History (Last 20 Messages)

```python
async def get_conversation_history(
    session: Session,
    conversation_id: int,
    user_id: str,
    limit: int = 20
) -> list[Message]:
    """Load recent messages for a conversation with user isolation."""
    statement = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.user_id == user_id)  # User isolation
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    messages = session.exec(statement).all()
    return list(reversed(messages))  # Return in chronological order
```

### Create New Conversation

```python
async def create_conversation(
    session: Session,
    user_id: str,
    title: str | None = None
) -> Conversation:
    """Create a new conversation for a user."""
    conversation = Conversation(user_id=user_id, title=title)
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation
```

### Store Message

```python
async def store_message(
    session: Session,
    conversation_id: int,
    user_id: str,
    role: str,
    content: str,
    tool_calls: dict | None = None,
    tool_call_id: str | None = None
) -> Message:
    """Store a new message in a conversation."""
    message = Message(
        conversation_id=conversation_id,
        user_id=user_id,
        role=role,
        content=content,
        tool_calls=tool_calls,
        tool_call_id=tool_call_id
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return message
```

### List User Conversations

```python
async def get_user_conversations(
    session: Session,
    user_id: str,
    limit: int = 50
) -> list[Conversation]:
    """Get all conversations for a user, ordered by recent activity."""
    statement = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
    )
    return list(session.exec(statement).all())
```

---

## Security Considerations

1. **User Isolation**: Every query MUST filter by `user_id` to prevent cross-user data access.

2. **Cascade Delete**: When a user is deleted, all their conversations and messages are automatically removed.

3. **Input Validation**: Message content must be sanitized before storage to prevent injection attacks.

4. **Tool Calls Validation**: The `tool_calls` JSON must be validated against expected schema before execution.

5. **Foreign Key Enforcement**: Database-level constraints ensure referential integrity.

---

## Performance Considerations

1. **Indexes**: All foreign keys and frequently queried columns are indexed.

2. **Message Limit**: Only last 20 messages loaded per request to control memory and API costs.

3. **Timestamp Index**: Messages indexed by `created_at` for efficient ordering.

4. **Connection Pooling**: Reuse existing Phase II database connection pool.
