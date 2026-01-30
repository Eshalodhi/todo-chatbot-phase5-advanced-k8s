"""
Event publishing helper functions for Phase V.

Provides high-level functions for publishing domain events.
"""

import logging
from typing import Optional
from datetime import datetime

from app.events.producer import publish_event
from app.events.task_events import (
    TaskCreatedEvent,
    TaskUpdatedEvent,
    TaskCompletedEvent,
    TaskDeletedEvent,
)
from app.events.reminder_events import (
    ReminderScheduledEvent,
    ReminderCancelledEvent,
)
from app.events.recurring_events import RecurringTaskCreatedEvent

logger = logging.getLogger(__name__)

# Topic names per specs/phase5/03-kafka-integration.md
TASK_EVENTS_TOPIC = "task-events"
REMINDER_EVENTS_TOPIC = "reminder-events"
NOTIFICATION_EVENTS_TOPIC = "notification-events"


# =============================================================================
# Task Event Publishers
# =============================================================================


async def publish_task_created(
    user_id: str,
    task_id: int,
    title: str,
    description: Optional[str] = None,
    priority: str = "medium",
    due_date: Optional[datetime] = None,
    tags: list[str] = None,
    recurrence_pattern: Optional[str] = None,
) -> bool:
    """
    Publish a task.created event.

    Args:
        user_id: Owner's user ID
        task_id: Created task ID
        title: Task title
        description: Optional task description
        priority: Task priority (low/medium/high)
        due_date: Optional due date
        tags: Optional list of tag names
        recurrence_pattern: Optional recurrence (daily/weekly/monthly)

    Returns:
        True if published successfully
    """
    event = TaskCreatedEvent.create(
        user_id=user_id,
        task_id=task_id,
        title=title,
        description=description,
        priority=priority,
        due_date=due_date,
        tags=tags,
        recurrence_pattern=recurrence_pattern,
    )
    return await publish_event(TASK_EVENTS_TOPIC, event.to_dict(), key=user_id)


async def publish_task_updated(
    user_id: str,
    task_id: int,
    changed_fields: dict,
) -> bool:
    """
    Publish a task.updated event.

    Args:
        user_id: Owner's user ID
        task_id: Updated task ID
        changed_fields: Dict of changed fields with before/after values

    Returns:
        True if published successfully
    """
    event = TaskUpdatedEvent.create(
        user_id=user_id,
        task_id=task_id,
        changed_fields=changed_fields,
    )
    return await publish_event(TASK_EVENTS_TOPIC, event.to_dict(), key=user_id)


async def publish_task_completed(
    user_id: str,
    task_id: int,
    title: str,
    completed_at: datetime,
    had_recurrence: bool,
    recurrence_pattern: Optional[str] = None,
    recurrence_end_date: Optional[datetime] = None,
) -> bool:
    """
    Publish a task.completed event.

    Args:
        user_id: Owner's user ID
        task_id: Completed task ID
        title: Task title
        completed_at: Completion timestamp
        had_recurrence: Whether task had recurrence pattern
        recurrence_pattern: Optional recurrence pattern
        recurrence_end_date: Optional recurrence end date

    Returns:
        True if published successfully
    """
    event = TaskCompletedEvent.create(
        user_id=user_id,
        task_id=task_id,
        title=title,
        completed_at=completed_at,
        had_recurrence=had_recurrence,
        recurrence_pattern=recurrence_pattern,
        recurrence_end_date=recurrence_end_date,
    )
    return await publish_event(TASK_EVENTS_TOPIC, event.to_dict(), key=user_id)


async def publish_task_deleted(
    user_id: str,
    task_id: int,
    title: str,
) -> bool:
    """
    Publish a task.deleted event.

    Args:
        user_id: Owner's user ID
        task_id: Deleted task ID
        title: Task title

    Returns:
        True if published successfully
    """
    event = TaskDeletedEvent.create(
        user_id=user_id,
        task_id=task_id,
        title=title,
    )
    return await publish_event(TASK_EVENTS_TOPIC, event.to_dict(), key=user_id)


# =============================================================================
# Reminder Event Publishers
# =============================================================================


async def publish_reminder_scheduled(
    user_id: str,
    reminder_id: int,
    task_id: int,
    remind_at: datetime,
    task_title: Optional[str] = None,
    task_due_date: Optional[datetime] = None,
) -> bool:
    """
    Publish a reminder.scheduled event.

    Args:
        user_id: Owner's user ID
        reminder_id: Created reminder ID
        task_id: Associated task ID
        remind_at: When to send reminder
        task_title: Optional task title
        task_due_date: Optional task due date

    Returns:
        True if published successfully
    """
    event = ReminderScheduledEvent.create(
        user_id=user_id,
        reminder_id=reminder_id,
        task_id=task_id,
        remind_at=remind_at,
        task_title=task_title,
        task_due_date=task_due_date,
    )
    return await publish_event(REMINDER_EVENTS_TOPIC, event.to_dict(), key=user_id)


async def publish_reminder_cancelled(
    user_id: str,
    reminder_id: int,
    reason: str,
    task_id: Optional[int] = None,
) -> bool:
    """
    Publish a reminder.cancelled event.

    Args:
        user_id: Owner's user ID
        reminder_id: Cancelled reminder ID
        reason: Cancellation reason
        task_id: Optional associated task ID

    Returns:
        True if published successfully
    """
    event = ReminderCancelledEvent.create(
        user_id=user_id,
        reminder_id=reminder_id,
        reason=reason,
        task_id=task_id,
    )
    return await publish_event(REMINDER_EVENTS_TOPIC, event.to_dict(), key=user_id)


# =============================================================================
# Recurring Task Event Publishers
# =============================================================================


async def publish_recurring_task_created(
    user_id: str,
    original_task_id: int,
    new_task_id: int,
    recurrence_pattern: str,
    next_due_date: datetime,
) -> bool:
    """
    Publish a recurring.task.created event.

    Args:
        user_id: Owner's user ID
        original_task_id: Completed task that triggered recurrence
        new_task_id: Newly created task ID
        recurrence_pattern: Recurrence pattern (daily/weekly/monthly)
        next_due_date: Due date for new task

    Returns:
        True if published successfully
    """
    event = RecurringTaskCreatedEvent.create(
        user_id=user_id,
        original_task_id=original_task_id,
        new_task_id=new_task_id,
        recurrence_pattern=recurrence_pattern,
        next_due_date=next_due_date,
    )
    return await publish_event(TASK_EVENTS_TOPIC, event.to_dict(), key=user_id)
