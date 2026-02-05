"""
Task event schema classes for Phase V.

Per specs/phase5/contracts/task-events.json
"""

from datetime import datetime
from typing import Any, Optional

from app.events.schemas import EventEnvelope, BasePayload


# =============================================================================
# Task Event Payloads
# =============================================================================


class TaskCreatedPayload(BasePayload):
    """Payload for task.created event."""
    task_id: int
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    tags: list[str] = []
    recurrence_pattern: Optional[str] = None


class TaskUpdatedPayload(BasePayload):
    """Payload for task.updated event."""
    task_id: int
    changed_fields: dict[str, dict[str, Any]]  # {"field": {"before": x, "after": y}}


class TaskCompletedPayload(BasePayload):
    """Payload for task.completed event."""
    task_id: int
    title: str
    completed_at: str
    had_recurrence: bool
    recurrence_pattern: Optional[str] = None
    recurrence_end_date: Optional[str] = None


class TaskDeletedPayload(BasePayload):
    """Payload for task.deleted event."""
    task_id: int
    title: str


# =============================================================================
# Task Event Classes
# =============================================================================


class TaskCreatedEvent(EventEnvelope):
    """
    Event published when a task is created.

    Per specs/phase5/contracts/task-events.json
    """
    event_type: str = "task.created"

    @classmethod
    def create(
        cls,
        user_id: str,
        task_id: int,
        title: str,
        description: Optional[str] = None,
        priority: str = "medium",
        due_date: Optional[datetime] = None,
        tags: list[str] = None,
        recurrence_pattern: Optional[str] = None,
    ) -> "TaskCreatedEvent":
        """Factory method to create a TaskCreatedEvent."""
        payload = TaskCreatedPayload(
            task_id=task_id,
            title=title,
            description=description,
            priority=priority,
            due_date=due_date.isoformat() if due_date else None,
            tags=tags or [],
            recurrence_pattern=recurrence_pattern,
        )
        return cls(
            user_id=user_id,
            payload=payload.model_dump(),
        )


class TaskUpdatedEvent(EventEnvelope):
    """
    Event published when a task is updated.

    Per specs/phase5/contracts/task-events.json
    """
    event_type: str = "task.updated"

    @classmethod
    def create(
        cls,
        user_id: str,
        task_id: int,
        changed_fields: dict[str, dict[str, Any]],
    ) -> "TaskUpdatedEvent":
        """Factory method to create a TaskUpdatedEvent."""
        payload = TaskUpdatedPayload(
            task_id=task_id,
            changed_fields=changed_fields,
        )
        return cls(
            user_id=user_id,
            payload=payload.model_dump(),
        )


class TaskCompletedEvent(EventEnvelope):
    """
    Event published when a task is completed.

    Per specs/phase5/contracts/task-events.json
    """
    event_type: str = "task.completed"

    @classmethod
    def create(
        cls,
        user_id: str,
        task_id: int,
        title: str,
        completed_at: datetime,
        had_recurrence: bool,
        recurrence_pattern: Optional[str] = None,
        recurrence_end_date: Optional[datetime] = None,
    ) -> "TaskCompletedEvent":
        """Factory method to create a TaskCompletedEvent."""
        payload = TaskCompletedPayload(
            task_id=task_id,
            title=title,
            completed_at=completed_at.isoformat(),
            had_recurrence=had_recurrence,
            recurrence_pattern=recurrence_pattern,
            recurrence_end_date=recurrence_end_date.isoformat() if recurrence_end_date else None,
        )
        return cls(
            user_id=user_id,
            payload=payload.model_dump(),
        )


class TaskDeletedEvent(EventEnvelope):
    """
    Event published when a task is deleted.

    Per specs/phase5/contracts/task-events.json
    """
    event_type: str = "task.deleted"

    @classmethod
    def create(
        cls,
        user_id: str,
        task_id: int,
        title: str,
    ) -> "TaskDeletedEvent":
        """Factory method to create a TaskDeletedEvent."""
        payload = TaskDeletedPayload(
            task_id=task_id,
            title=title,
        )
        return cls(
            user_id=user_id,
            payload=payload.model_dump(),
        )
