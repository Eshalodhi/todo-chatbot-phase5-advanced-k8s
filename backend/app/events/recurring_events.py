"""
Recurring task event schema classes for Phase V.

Per specs/phase5/contracts/task-events.json
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.events.schemas import EventEnvelope, BasePayload


# =============================================================================
# Recurring Task Event Payloads
# =============================================================================


class RecurringTaskCreatedPayload(BasePayload):
    """Payload for recurring.task.created event."""
    original_task_id: int
    new_task_id: int
    recurrence_pattern: str  # "daily", "weekly", "monthly"
    next_due_date: str


# =============================================================================
# Recurring Task Event Classes
# =============================================================================


class RecurringTaskCreatedEvent(EventEnvelope):
    """
    Event published when a new recurring task instance is created.

    Per specs/phase5/contracts/task-events.json
    """
    event_type: str = "recurring.task.created"
    source: str = "recurring-task-service"

    @classmethod
    def create(
        cls,
        user_id: str,
        original_task_id: int,
        new_task_id: int,
        recurrence_pattern: str,
        next_due_date: datetime,
    ) -> "RecurringTaskCreatedEvent":
        """Factory method to create a RecurringTaskCreatedEvent."""
        payload = RecurringTaskCreatedPayload(
            original_task_id=original_task_id,
            new_task_id=new_task_id,
            recurrence_pattern=recurrence_pattern,
            next_due_date=next_due_date.isoformat(),
        )
        return cls(
            user_id=user_id,
            payload=payload.model_dump(),
        )
