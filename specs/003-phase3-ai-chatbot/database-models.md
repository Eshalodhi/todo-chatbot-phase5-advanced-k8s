# Database Models Specification

**Parent Spec**: [Phase III AI Chatbot](./spec.md)
**Created**: 2026-01-16
**Status**: Draft

## Overview

Two new database models for chat persistence: `Conversation` and `Message`. These extend the existing Neon PostgreSQL database alongside the existing `User` and `Task` models from Phase II.

## Entity Relationship Diagram

```
┌─────────────────────┐
│       users         │
├─────────────────────┤
│ id (PK)             │
│ email               │
│ name                │
│ ...                 │
└─────────────────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐      ┌─────────────────────┐
│       tasks         │      │   conversations     │
├─────────────────────┤      ├─────────────────────┤
│ id (PK)             │      │ id (PK)             │
│ user_id (FK)        │◄────►│ user_id (FK)        │
│ title               │      │ created_at          │
│ completed           │      │ updated_at          │
│ created_at          │      └─────────────────────┘
└─────────────────────┘                │
                                       │ 1:N
                                       ▼
                         ┌─────────────────────┐
                         │     messages        │
                         ├─────────────────────┤
                         │ id (PK)             │
                         │ conversation_id (FK)│
                         │ role                │
                         │ content             │
                         │ tool_calls (JSON)   │
                         │ created_at          │
                         └─────────────────────┘
```

## Model Definitions

### Conversation Model

```python
# backend/app/models/conversation.py

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship

if TYPE_CHECKING:
    from .message import Message
    from .user import User

class ConversationBase(SQLModel):
    """Base fields for Conversation."""
    pass

class Conversation(ConversationBase, table=True):
    """
    Represents a chat conversation session.

    A conversation groups related messages together and is owned by a single user.
    """
    __tablename__ = "conversations"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
        index=True,
        description="Unique conversation identifier"
    )
    user_id: str = Field(
        foreign_key="users.id",
        index=True,
        nullable=False,
        description="Owner of this conversation"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        description="When conversation was started"
    )
    updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        description="Last activity timestamp"
    )

    # Relationships
    messages: List["Message"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    user: Optional["User"] = Relationship(back_populates="conversations")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "user_id": "user_123",
                "created_at": "2026-01-16T10:00:00Z",
                "updated_at": "2026-01-16T10:30:00Z"
            }
        }
```

### Message Model

```python
# backend/app/models/message.py

from datetime import datetime
from typing import Optional, Any, TYPE_CHECKING
from uuid import UUID, uuid4
from enum import Enum

from sqlmodel import Field, SQLModel, Relationship, Column
from sqlalchemy import JSON

if TYPE_CHECKING:
    from .conversation import Conversation

class MessageRole(str, Enum):
    """Valid message roles."""
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"

class MessageBase(SQLModel):
    """Base fields for Message."""
    role: MessageRole = Field(
        description="Who sent this message: user, assistant, or tool"
    )
    content: str = Field(
        description="The message content"
    )

class Message(MessageBase, table=True):
    """
    Represents a single message in a conversation.

    Messages can be from the user, the AI assistant, or tool execution results.
    """
    __tablename__ = "messages"

    id: UUID = Field(
        default_factory=uuid4,
        primary_key=True,
        index=True,
        description="Unique message identifier"
    )
    conversation_id: UUID = Field(
        foreign_key="conversations.id",
        index=True,
        nullable=False,
        description="Parent conversation"
    )
    role: MessageRole = Field(
        nullable=False,
        description="Message sender role"
    )
    content: str = Field(
        nullable=False,
        description="Message text content"
    )
    tool_calls: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSON),
        description="Tool calls and results (for assistant messages)"
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        nullable=False,
        index=True,
        description="When message was created"
    )

    # Relationships
    conversation: Optional["Conversation"] = Relationship(
        back_populates="messages"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "id": "660e8400-e29b-41d4-a716-446655440001",
                "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
                "role": "user",
                "content": "Add a task to buy groceries",
                "tool_calls": None,
                "created_at": "2026-01-16T10:00:00Z"
            }
        }
```

## Database Schema (SQL)

```sql
-- Conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for conversations
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at);
```

## Migration

### Alembic Migration Script

```python
# backend/alembic/versions/xxx_add_chat_models.py

"""Add conversation and message tables for chat

Revision ID: xxx
Revises: previous_revision
Create Date: 2026-01-16

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'xxx'
down_revision = 'previous_revision'
branch_labels = None
depends_on = None

def upgrade():
    # Create conversations table
    op.create_table(
        'conversations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(255), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('idx_conversations_user_id', 'conversations', ['user_id'])
    op.create_index('idx_conversations_updated_at', 'conversations', ['updated_at'])

    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('tool_calls', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('idx_messages_conversation_id', 'messages', ['conversation_id'])
    op.create_index('idx_messages_created_at', 'messages', ['created_at'])
    op.create_index('idx_messages_conversation_created', 'messages', ['conversation_id', 'created_at'])

    # Add check constraint for role
    op.create_check_constraint(
        'ck_messages_role',
        'messages',
        "role IN ('user', 'assistant', 'tool')"
    )

def downgrade():
    op.drop_table('messages')
    op.drop_table('conversations')
```

## User Model Extension

Update the existing User model to include the conversations relationship:

```python
# backend/app/models/user.py (addition)

from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from .conversation import Conversation

class User(UserBase, table=True):
    # ... existing fields ...

    # Add this relationship
    conversations: List["Conversation"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
```

## CRUD Operations

### Conversation CRUD

```python
# backend/app/crud/conversation.py

from uuid import UUID
from typing import Optional, List
from datetime import datetime

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.conversation import Conversation

class ConversationCRUD:
    @staticmethod
    async def create(db: AsyncSession, user_id: str) -> Conversation:
        """Create a new conversation."""
        conversation = Conversation(user_id=user_id)
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        return conversation

    @staticmethod
    async def get(db: AsyncSession, conversation_id: UUID) -> Optional[Conversation]:
        """Get conversation by ID."""
        return await db.get(Conversation, conversation_id)

    @staticmethod
    async def get_by_user(
        db: AsyncSession,
        user_id: str,
        limit: int = 20,
        offset: int = 0
    ) -> List[Conversation]:
        """Get user's conversations, most recent first."""
        result = await db.execute(
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def update_timestamp(db: AsyncSession, conversation: Conversation) -> Conversation:
        """Update the conversation's updated_at timestamp."""
        conversation.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(conversation)
        return conversation

    @staticmethod
    async def delete(db: AsyncSession, conversation: Conversation) -> None:
        """Delete a conversation and all its messages (cascade)."""
        await db.delete(conversation)
        await db.commit()
```

### Message CRUD

```python
# backend/app/crud/message.py

from uuid import UUID
from typing import List, Optional

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.message import Message, MessageRole

class MessageCRUD:
    @staticmethod
    async def create(
        db: AsyncSession,
        conversation_id: UUID,
        role: MessageRole,
        content: str,
        tool_calls: Optional[dict] = None
    ) -> Message:
        """Create a new message."""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_calls=tool_calls
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message

    @staticmethod
    async def get_by_conversation(
        db: AsyncSession,
        conversation_id: UUID,
        limit: int = 50,
        offset: int = 0
    ) -> List[Message]:
        """Get messages for a conversation, oldest first."""
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_recent(
        db: AsyncSession,
        conversation_id: UUID,
        limit: int = 20
    ) -> List[Message]:
        """Get most recent messages for a conversation."""
        result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        # Return in chronological order
        return list(reversed(result.scalars().all()))
```

## Data Integrity

### Foreign Key Constraints

| Constraint | Table | Column | References | On Delete |
|------------|-------|--------|------------|-----------|
| FK_conversation_user | conversations | user_id | users.id | CASCADE |
| FK_message_conversation | messages | conversation_id | conversations.id | CASCADE |

### Cascade Behavior

- Deleting a User → Deletes all Conversations → Deletes all Messages
- Deleting a Conversation → Deletes all Messages

### Check Constraints

- `messages.role` must be one of: 'user', 'assistant', 'tool'

## Performance Considerations

### Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| idx_conversations_user_id | conversations | user_id | User's conversation lookup |
| idx_conversations_updated_at | conversations | updated_at DESC | Recent conversations |
| idx_messages_conversation_id | messages | conversation_id | Messages in conversation |
| idx_messages_created_at | messages | created_at | Message ordering |
| idx_messages_conversation_created | messages | conversation_id, created_at | Combined query optimization |

### Query Optimization

```python
# Efficient query for chat history (uses composite index)
SELECT * FROM messages
WHERE conversation_id = $1
ORDER BY created_at DESC
LIMIT 20;

# Efficient query for user's recent conversations
SELECT * FROM conversations
WHERE user_id = $1
ORDER BY updated_at DESC
LIMIT 10;
```

## Testing Requirements

### Model Tests

- [ ] Conversation creates with UUID and timestamps
- [ ] Message creates with all fields
- [ ] MessageRole enum validates correctly
- [ ] tool_calls JSON field serializes/deserializes
- [ ] Relationships resolve correctly

### CRUD Tests

- [ ] Create conversation
- [ ] Get conversation by ID
- [ ] Get conversations by user
- [ ] Create message
- [ ] Get messages by conversation
- [ ] Delete conversation cascades to messages

### Integrity Tests

- [ ] Cannot create conversation without valid user_id
- [ ] Cannot create message without valid conversation_id
- [ ] Invalid role is rejected
- [ ] Deleting user cascades to conversations
- [ ] Deleting conversation cascades to messages

## Acceptance Criteria

- [ ] Conversation model implemented with SQLModel
- [ ] Message model implemented with SQLModel
- [ ] Migration script creates tables and indexes
- [ ] Foreign key constraints enforced
- [ ] Cascade delete works correctly
- [ ] CRUD operations implemented
- [ ] User isolation enforced (filter by user_id)
- [ ] tool_calls stores JSON correctly
- [ ] All indexes created for performance
