# Conversation Database Models Skill

## Purpose
Guide implementation of Conversation and Message SQLModel models for storing AI chat history with user isolation.

---

## Models Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CONVERSATION                             │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)          │ UUID string                                   │
│ user_id (INDEX)  │ Owner of conversation                         │
│ title            │ Auto-generated from first message             │
│ created_at       │ Session start time                            │
│ updated_at       │ Last activity time                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           MESSAGE                                │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)              │ UUID string                               │
│ conversation_id (FK) │ Parent conversation                       │
│ user_id (INDEX)      │ For isolation queries                     │
│ role                 │ 'system' | 'user' | 'assistant' | 'tool'  │
│ content              │ Message text                              │
│ tool_calls           │ JSON string (for assistant tool calls)    │
│ tool_call_id         │ For tool response messages                │
│ created_at           │ Message timestamp (for ordering)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conversation Model

```python
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
import uuid

if TYPE_CHECKING:
    from .message import Message


class Conversation(SQLModel, table=True):
    """
    Chat session between a user and the AI assistant.

    Each conversation belongs to one user and contains multiple messages.
    Conversations are isolated by user_id for security.
    """

    __tablename__ = "conversation"

    # Primary key
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        description="Unique conversation identifier"
    )

    # User isolation (CRITICAL)
    user_id: str = Field(
        index=True,
        description="Owner of this conversation"
    )

    # Metadata
    title: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Conversation title (auto-generated from first message)"
    )

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="When conversation started"
    )

    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Last activity timestamp"
    )

    # Relationship to messages
    messages: list["Message"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )

    def update_timestamp(self) -> None:
        """Update the updated_at timestamp."""
        self.updated_at = datetime.now(timezone.utc)

    def generate_title(self, first_message: str) -> None:
        """Generate title from first user message."""
        if not self.title and first_message:
            # Truncate to 50 chars and add ellipsis
            self.title = first_message[:50] + ("..." if len(first_message) > 50 else "")
```

---

## Message Model

```python
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
import uuid
import json

if TYPE_CHECKING:
    from .conversation import Conversation


class Message(SQLModel, table=True):
    """
    Individual message in a conversation.

    Stores all message types:
    - system: Initial instructions for AI
    - user: User's input
    - assistant: AI's response
    - tool: Result from tool execution

    Messages are ordered by created_at for conversation flow.
    """

    __tablename__ = "message"

    # Primary key
    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True,
        description="Unique message identifier"
    )

    # Foreign key to conversation
    conversation_id: str = Field(
        foreign_key="conversation.id",
        index=True,
        description="Parent conversation"
    )

    # User isolation (denormalized for query efficiency)
    user_id: str = Field(
        index=True,
        description="Owner (duplicated from conversation for fast queries)"
    )

    # Message content
    role: str = Field(
        description="Message role: 'system', 'user', 'assistant', or 'tool'"
    )

    content: Optional[str] = Field(
        default=None,
        description="Message text content"
    )

    # Tool-related fields
    tool_calls: Optional[str] = Field(
        default=None,
        description="JSON string of tool calls (for assistant messages)"
    )

    tool_call_id: Optional[str] = Field(
        default=None,
        description="Tool call ID (for tool response messages)"
    )

    # Timestamp for ordering
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True,  # Index for ordering queries
        description="When message was created"
    )

    # Relationship to conversation
    conversation: Optional["Conversation"] = Relationship(
        back_populates="messages"
    )

    def to_openai_format(self) -> dict:
        """
        Convert to OpenAI API message format.

        Returns dict compatible with OpenAI chat completion API.
        """
        if self.role == "tool":
            return {
                "role": "tool",
                "tool_call_id": self.tool_call_id,
                "content": self.content or ""
            }

        if self.tool_calls:
            return {
                "role": "assistant",
                "content": self.content,
                "tool_calls": json.loads(self.tool_calls)
            }

        return {
            "role": self.role,
            "content": self.content or ""
        }

    @classmethod
    def from_openai_response(
        cls,
        conversation_id: str,
        user_id: str,
        openai_message: dict
    ) -> "Message":
        """
        Create Message from OpenAI API response.

        Args:
            conversation_id: Parent conversation
            user_id: Owner
            openai_message: Message dict from OpenAI response

        Returns:
            New Message instance
        """
        tool_calls = None
        if "tool_calls" in openai_message and openai_message["tool_calls"]:
            tool_calls = json.dumps(openai_message["tool_calls"])

        return cls(
            conversation_id=conversation_id,
            user_id=user_id,
            role=openai_message["role"],
            content=openai_message.get("content"),
            tool_calls=tool_calls,
            tool_call_id=openai_message.get("tool_call_id")
        )
```

---

## Role Types

```python
from enum import Enum

class MessageRole(str, Enum):
    """Valid message roles."""
    SYSTEM = "system"      # AI instructions (not shown to user)
    USER = "user"          # User's input
    ASSISTANT = "assistant" # AI's response
    TOOL = "tool"          # Tool execution result

# Usage in Message model
role: str = Field(
    description="Message role: 'system', 'user', 'assistant', or 'tool'"
)

# Validation helper
def validate_role(role: str) -> bool:
    return role in [r.value for r in MessageRole]
```

---

## Database Indexes

```python
from sqlmodel import SQLModel
from sqlalchemy import Index

# Composite indexes for common queries
class Message(SQLModel, table=True):
    __table_args__ = (
        # Fast lookup: messages in a conversation ordered by time
        Index("ix_message_conversation_created", "conversation_id", "created_at"),

        # Fast lookup: all messages for a user
        Index("ix_message_user_created", "user_id", "created_at"),
    )
```

---

## CRUD Operations

### Create Conversation

```python
from sqlmodel import Session

def create_conversation(user_id: str, session: Session) -> Conversation:
    """Create a new conversation for a user."""
    conversation = Conversation(user_id=user_id)
    session.add(conversation)
    session.commit()
    session.refresh(conversation)
    return conversation
```

### Get Conversation (with user isolation)

```python
from sqlmodel import Session, select
from fastapi import HTTPException

def get_conversation(
    conversation_id: str,
    user_id: str,
    session: Session
) -> Conversation:
    """
    Get conversation by ID with user isolation.

    CRITICAL: Always filter by user_id to prevent unauthorized access.
    """
    conversation = session.exec(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id  # SECURITY
        )
    ).first()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return conversation
```

### List User's Conversations

```python
def list_conversations(
    user_id: str,
    session: Session,
    limit: int = 20,
    offset: int = 0
) -> list[Conversation]:
    """List conversations for a user, newest first."""
    return session.exec(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
```

### Add Message

```python
def add_message(
    conversation_id: str,
    user_id: str,
    role: str,
    content: Optional[str],
    session: Session,
    tool_calls: Optional[str] = None,
    tool_call_id: Optional[str] = None
) -> Message:
    """Add a message to a conversation."""
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

### Load Message History

```python
def load_messages(
    conversation_id: str,
    user_id: str,
    session: Session,
    limit: int = 50
) -> list[dict]:
    """
    Load messages for OpenAI API.

    Args:
        conversation_id: Conversation to load
        user_id: For security verification
        session: Database session
        limit: Max messages (to prevent token overflow)

    Returns:
        List of messages in OpenAI format
    """
    messages = session.exec(
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.user_id == user_id  # SECURITY
        )
        .order_by(Message.created_at.asc())
        .limit(limit)
    ).all()

    return [msg.to_openai_format() for msg in messages]
```

### Delete Conversation (cascade deletes messages)

```python
def delete_conversation(
    conversation_id: str,
    user_id: str,
    session: Session
) -> bool:
    """Delete conversation and all its messages."""
    conversation = get_conversation(conversation_id, user_id, session)

    session.delete(conversation)
    session.commit()
    return True
```

---

## Alembic Migration

```python
"""Create conversation and message tables

Revision ID: xxxx
Create Date: 2024-01-15
"""

from alembic import op
import sqlalchemy as sa

def upgrade():
    # Conversation table
    op.create_table(
        'conversation',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), nullable=False, index=True),
        sa.Column('title', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Message table
    op.create_table(
        'message',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('conversation_id', sa.String(), sa.ForeignKey('conversation.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('tool_calls', sa.Text(), nullable=True),
        sa.Column('tool_call_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Indexes
    op.create_index('ix_message_conversation_id', 'message', ['conversation_id'])
    op.create_index('ix_message_user_id', 'message', ['user_id'])
    op.create_index('ix_message_created_at', 'message', ['created_at'])
    op.create_index('ix_message_conversation_created', 'message', ['conversation_id', 'created_at'])


def downgrade():
    op.drop_table('message')
    op.drop_table('conversation')
```

---

## File Structure

```
backend/app/
├── models/
│   ├── __init__.py
│   ├── conversation.py   # Conversation model
│   ├── message.py        # Message model
│   └── user.py           # User model (existing)
├── crud/
│   ├── __init__.py
│   └── conversation.py   # CRUD operations
└── database.py           # DB connection
```

### models/__init__.py

```python
from .user import User
from .conversation import Conversation
from .message import Message

__all__ = ["User", "Conversation", "Message"]
```

---

## User Isolation Pattern

### CRITICAL: Always filter by user_id

```python
# CORRECT - Isolated query
messages = session.exec(
    select(Message).where(
        Message.conversation_id == conversation_id,
        Message.user_id == user_id  # ALWAYS include this
    )
).all()

# WRONG - Security vulnerability
messages = session.exec(
    select(Message).where(
        Message.conversation_id == conversation_id
        # Missing user_id filter - users can see other users' messages!
    )
).all()
```

### Why denormalize user_id in Message?

```python
# Message has both conversation_id AND user_id
# This seems redundant but enables:

# 1. Single-table queries (no JOIN needed)
messages = select(Message).where(Message.user_id == user_id)

# 2. Composite index efficiency
Index("ix_message_user_created", "user_id", "created_at")

# 3. Simpler security checks in every query
```

---

## Testing

```python
import pytest
from sqlmodel import Session

@pytest.fixture
def test_user_id():
    return "user-123"

@pytest.fixture
def other_user_id():
    return "user-456"

def test_conversation_creation(session: Session, test_user_id: str):
    """Test creating a conversation."""
    conv = create_conversation(test_user_id, session)

    assert conv.id is not None
    assert conv.user_id == test_user_id
    assert conv.created_at is not None

def test_message_creation(session: Session, test_user_id: str):
    """Test adding messages to conversation."""
    conv = create_conversation(test_user_id, session)

    msg = add_message(
        conversation_id=conv.id,
        user_id=test_user_id,
        role="user",
        content="Hello",
        session=session
    )

    assert msg.id is not None
    assert msg.role == "user"
    assert msg.content == "Hello"

def test_user_isolation(session: Session, test_user_id: str, other_user_id: str):
    """Test that users can't access each other's conversations."""
    # Create conversation for test_user
    conv = create_conversation(test_user_id, session)

    # Other user should not be able to access it
    with pytest.raises(HTTPException) as exc:
        get_conversation(conv.id, other_user_id, session)

    assert exc.value.status_code == 404

def test_message_ordering(session: Session, test_user_id: str):
    """Test messages are returned in chronological order."""
    conv = create_conversation(test_user_id, session)

    add_message(conv.id, test_user_id, "user", "First", session)
    add_message(conv.id, test_user_id, "assistant", "Second", session)
    add_message(conv.id, test_user_id, "user", "Third", session)

    messages = load_messages(conv.id, test_user_id, session)

    assert messages[0]["content"] == "First"
    assert messages[1]["content"] == "Second"
    assert messages[2]["content"] == "Third"

def test_cascade_delete(session: Session, test_user_id: str):
    """Test deleting conversation deletes all messages."""
    conv = create_conversation(test_user_id, session)
    add_message(conv.id, test_user_id, "user", "Test", session)

    delete_conversation(conv.id, test_user_id, session)

    # Messages should be gone
    messages = session.exec(
        select(Message).where(Message.conversation_id == conv.id)
    ).all()

    assert len(messages) == 0

def test_openai_format_conversion(session: Session, test_user_id: str):
    """Test message conversion to OpenAI format."""
    conv = create_conversation(test_user_id, session)

    # User message
    user_msg = add_message(conv.id, test_user_id, "user", "Hello", session)
    assert user_msg.to_openai_format() == {"role": "user", "content": "Hello"}

    # Tool message
    tool_msg = add_message(
        conv.id, test_user_id, "tool", '{"success": true}',
        session, tool_call_id="call_123"
    )
    assert tool_msg.to_openai_format() == {
        "role": "tool",
        "tool_call_id": "call_123",
        "content": '{"success": true}'
    }
```

---

## Checklist

- [ ] Conversation model with user_id index
- [ ] Message model with conversation_id foreign key
- [ ] user_id denormalized in Message for query efficiency
- [ ] created_at indexed for ordering
- [ ] Cascade delete on conversation removes messages
- [ ] to_openai_format() method on Message
- [ ] All queries filter by user_id
- [ ] Alembic migration created
- [ ] Tests for user isolation
