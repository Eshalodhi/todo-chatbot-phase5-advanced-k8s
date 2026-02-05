"""
Reminder event schema classes for Phase V.

Per specs/phase5/contracts/reminder-events.json
"""

from datetime import datetime
from typing import Optional

from app.events.schemas import EventEnvelope, BasePayload


# =============================================================================
# Reminder Event Payloads
# =============================================================================


class ReminderScheduledPayload(BasePayload):
    """Payload for reminder.scheduled event."""
    reminder_id: int
    task_id: int
    task_title: Optional[str] = None
    remind_at: str
    task_due_date: Optional[str] = None


class ReminderTriggeredPayload(BasePayload):
    """Payload for reminder.triggered event."""
    reminder_id: int
    task_id: int
    task_title: str
    due_at: Optional[str] = None
    user_email: Optional[str] = None


class ReminderSentPayload(BasePayload):
    """Payload for reminder.sent event."""
    reminder_id: int
    channel: str  # "email", "push", "sms"
    sent_at: str
    recipient: Optional[str] = None


class ReminderCancelledPayload(BasePayload):
    """Payload for reminder.cancelled event."""
    reminder_id: int
    task_id: Optional[int] = None
    reason: str  # "task_completed", "task_deleted", "user_cancelled", "system"


class ReminderFailedPayload(BasePayload):
    """Payload for reminder.failed event."""
    reminder_id: int
    error: str
    retry_count: int
    will_retry: bool
    next_retry_at: Optional[str] = None


# =============================================================================
# Reminder Event Classes
# =============================================================================


class ReminderScheduledEvent(EventEnvelope):
    """
    Event published when a reminder is scheduled.

    Per specs/phase5/contracts/reminder-events.json
    """
    event_type: str = "reminder.scheduled"

    @classmethod
    def create(
        cls,
        user_id: str,
        reminder_id: int,
        task_id: int,
        remind_at: datetime,
        task_title: Optional[str] = None,
        task_due_date: Optional[datetime] = None,
    ) -> "ReminderScheduledEvent":
        """Factory method to create a ReminderScheduledEvent."""
        payload = ReminderScheduledPayload(
            reminder_id=reminder_id,
            task_id=task_id,
            task_title=task_title,
            remind_at=remind_at.isoformat(),
            task_due_date=task_due_date.isoformat() if task_due_date else None,
        )
        return cls(
            user_id=user_id,
            payload=payload.model_dump(),
        )


class ReminderTriggeredEvent(EventEnvelope):
    """
    Event published when a reminder's time arrives.

    Per specs/phase5/contracts/reminder-events.json
    """
    event_type: str = "reminder.triggered"
    source: str = "notification-service"

    @classmethod
    def create(
        cls,
        user_id: str,
        reminder_id: int,
        task_id: int,
        task_title: str,
        due_at: Optional[datetime] = None,
        user_email: Optional[str] = None,
    ) -> "ReminderTriggeredEvent":
        """Factory method to create a ReminderTriggeredEvent."""
        payload = ReminderTriggeredPayload(
            reminder_id=reminder_id,
            task_id=task_id,
            task_title=task_title,
            due_at=due_at.isoformat() if due_at else None,
            user_email=user_email,
        )
        return cls(
            user_id=user_id,
            payload=payload.model_dump(),
        )


class ReminderSentEvent(EventEnvelope):
    """
    Event published when a reminder notification is sent.

    Per specs/phase5/contracts/reminder-events.json
    """
    event_type: str = "reminder.sent"
    source: str = "notification-service"

    @classmethod
    def create(
        cls,
        user_id: str,
        reminder_id: int,
        channel: str,
        sent_at: datetime,
        recipient: Optional[str] = None,
    ) -> "ReminderSentEvent":
        """Factory method to create a ReminderSentEvent."""
        payload = ReminderSentPayload(
            reminder_id=reminder_id,
            channel=channel,
            sent_at=sent_at.isoformat(),
            recipient=recipient,
        )
        return cls(
            user_id=user_id,
            payload=payload.model_dump(),
        )


class ReminderCancelledEvent(EventEnvelope):
    """
    Event published when a reminder is cancelled.

    Per specs/phase5/contracts/reminder-events.json
    """
    event_type: str = "reminder.cancelled"

    @classmethod
    def create(
        cls,
        user_id: str,
        reminder_id: int,
        reason: str,
        task_id: Optional[int] = None,
    ) -> "ReminderCancelledEvent":
        """Factory method to create a ReminderCancelledEvent."""
        payload = ReminderCancelledPayload(
            reminder_id=reminder_id,
            task_id=task_id,
            reason=reason,
        )
        return cls(
            user_id=user_id,
            payload=payload.model_dump(),
        )


class ReminderFailedEvent(EventEnvelope):
    """
    Event published when a reminder notification fails.

    Per specs/phase5/contracts/reminder-events.json
    """
    event_type: str = "reminder.failed"
    source: str = "notification-service"

    @classmethod
    def create(
        cls,
        user_id: str,
        reminder_id: int,
        error: str,
        retry_count: int,
        will_retry: bool,
        next_retry_at: Optional[datetime] = None,
    ) -> "ReminderFailedEvent":
        """Factory method to create a ReminderFailedEvent."""
        payload = ReminderFailedPayload(
            reminder_id=reminder_id,
            error=error,
            retry_count=retry_count,
            will_retry=will_retry,
            next_retry_at=next_retry_at.isoformat() if next_retry_at else None,
        )
        return cls(
            user_id=user_id,
            payload=payload.model_dump(),
        )
