"""SQLModel entities for the Task management API."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List, Any
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import Text, JSON, UniqueConstraint


class Priority(str, Enum):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class RecurrencePattern(str, Enum):
    """Task recurrence patterns."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


def utc_now() -> datetime:
    """Return current UTC time."""
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    """
    User entity stored in Neon PostgreSQL.

    Attributes:
        id: Unique user identifier (UUID string)
        email: User email (unique, stored lowercase)
        name: User display name
        password_hash: Bcrypt hashed password (NEVER store plaintext, optional for OAuth users)
        oauth_provider: OAuth provider name (google, github) - null for email/password users
        oauth_id: User ID from OAuth provider - null for email/password users
        created_at: Account creation timestamp
    """

    __tablename__ = "users"

    id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    password_hash: Optional[str] = Field(default=None)  # Optional for OAuth users
    oauth_provider: Optional[str] = Field(default=None, index=True)  # google, github, etc.
    oauth_id: Optional[str] = Field(default=None)  # ID from OAuth provider
    created_at: datetime = Field(default_factory=utc_now)


class Task(SQLModel, table=True):
    """
    Task entity stored in Neon PostgreSQL.

    Attributes:
        id: Unique task identifier (auto-increment)
        user_id: Owner identifier from JWT 'sub' claim
        title: Task title (1-200 characters, required)
        description: Task details (optional)
        is_completed: Completion status (default: false)
        due_date: When task is due (UTC) - Phase V
        priority: low/medium/high (default: medium) - Phase V
        recurrence_pattern: daily/weekly/monthly or null - Phase V
        recurrence_end_date: When recurrence stops - Phase V
        created_at: Creation timestamp
        updated_at: Last modification timestamp
    """

    __tablename__ = "tasks"

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None)
    is_completed: bool = Field(default=False, index=True)

    # Phase V additions
    due_date: datetime | None = Field(default=None, index=True)
    priority: Priority = Field(default=Priority.MEDIUM, index=True)
    recurrence_pattern: RecurrencePattern | None = Field(default=None)
    recurrence_end_date: datetime | None = Field(default=None)

    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


# =============================================================================
# Phase III - Chat Models
# =============================================================================


class Conversation(SQLModel, table=True):
    """
    Chat conversation entity stored in Neon PostgreSQL.

    Represents a chat session between a user and the AI assistant.

    Attributes:
        id: Unique conversation identifier (auto-increment)
        user_id: Owner identifier from JWT 'sub' claim
        title: Optional conversation title (auto-generated from first message)
        created_at: Conversation start timestamp
        updated_at: Last activity timestamp
    """

    __tablename__ = "conversations"

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, foreign_key="users.id")
    title: str | None = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    # Relationships
    messages: List["Message"] = Relationship(
        back_populates="conversation",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class Message(SQLModel, table=True):
    """
    Chat message entity stored in Neon PostgreSQL.

    Represents a single message within a conversation.

    Attributes:
        id: Unique message identifier (auto-increment)
        conversation_id: Parent conversation ID
        user_id: Message owner (for user isolation queries)
        role: Message sender role ("user", "assistant", "tool")
        content: Message content or tool result
        tool_calls: Cohere tool_calls data (for assistant messages)
        tool_call_id: Tool call ID (for tool role messages)
        created_at: Message creation timestamp
    """

    __tablename__ = "messages"

    id: int | None = Field(default=None, primary_key=True)
    conversation_id: int = Field(index=True, foreign_key="conversations.id")
    user_id: str = Field(index=True, foreign_key="users.id")
    role: str = Field(max_length=20)  # "user", "assistant", "tool"
    content: str = Field(sa_column=Column(Text, nullable=False))
    tool_calls: dict | None = Field(default=None, sa_column=Column(JSON))
    tool_call_id: str | None = Field(default=None, max_length=100)
    created_at: datetime = Field(default_factory=utc_now, index=True)

    # Relationships
    conversation: Optional["Conversation"] = Relationship(back_populates="messages")


# =============================================================================
# Phase V - Advanced Features Models
# =============================================================================


class Reminder(SQLModel, table=True):
    """
    Reminder entity for task notifications.

    Per specs/phase5/data-model.md

    Attributes:
        id: Unique reminder identifier (auto-increment)
        task_id: Associated task ID
        user_id: Owner reference for user isolation
        remind_at: When to send reminder (UTC)
        sent: Whether notification was sent
        sent_at: When notification was sent
        retry_count: Number of send attempts
        created_at: Creation timestamp
        updated_at: Last modification timestamp
    """

    __tablename__ = "reminders"

    id: int | None = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="tasks.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    remind_at: datetime = Field(index=True)
    sent: bool = Field(default=False, index=True)
    sent_at: datetime | None = Field(default=None)
    retry_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class Tag(SQLModel, table=True):
    """
    User-scoped tag for categorizing tasks.

    Per specs/phase5/data-model.md

    Attributes:
        id: Unique tag identifier (auto-increment)
        user_id: Owner reference (tags are user-scoped)
        name: Tag name (1-50 chars, alphanumeric, hyphens, underscores)
        color: Optional hex color code (#RRGGBB)
        created_at: Creation timestamp
    """

    __tablename__ = "tags"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_tags_user_name"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    name: str = Field(max_length=50)
    color: str | None = Field(default=None, max_length=7)
    created_at: datetime = Field(default_factory=utc_now)


class TaskTag(SQLModel, table=True):
    """
    Join table for many-to-many relationship between tasks and tags.

    Per specs/phase5/data-model.md

    Attributes:
        id: Unique identifier (auto-increment)
        task_id: Associated task ID
        tag_id: Associated tag ID
        created_at: When tag was added to task
    """

    __tablename__ = "task_tags"
    __table_args__ = (UniqueConstraint("task_id", "tag_id", name="uq_task_tags_unique"),)

    id: int | None = Field(default=None, primary_key=True)
    task_id: int = Field(foreign_key="tasks.id", index=True)
    tag_id: int = Field(foreign_key="tags.id", index=True)
    created_at: datetime = Field(default_factory=utc_now)


class ProcessedEvent(SQLModel, table=True):
    """
    Tracks processed events for idempotency across microservices.

    Per specs/phase5/data-model.md

    Attributes:
        id: Unique identifier (auto-increment)
        event_id: UUID of processed event
        event_type: Type of event
        service_name: Service that processed it
        processed_at: When event was processed
    """

    __tablename__ = "processed_events"
    __table_args__ = (UniqueConstraint("event_id", "service_name", name="uq_processed_events_unique"),)

    id: int | None = Field(default=None, primary_key=True)
    event_id: str = Field(max_length=36, index=True)
    event_type: str = Field(max_length=50)
    service_name: str = Field(max_length=50)
    processed_at: datetime = Field(default_factory=utc_now)
