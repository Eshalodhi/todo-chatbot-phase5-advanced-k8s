# Notification System Skill

## Purpose

Guide for implementing a notification microservice for the Phase II Todo Chatbot application. Covers reminder scheduling, multi-channel delivery (email, push, SMS), retry mechanisms, timezone handling, and the Reminder data model.

## Technology Stack

- **FastAPI** - Async notification service
- **aiokafka** - Event consumption
- **APScheduler** - Scheduled reminder checks
- **SendGrid** - Email delivery
- **Firebase Cloud Messaging** - Push notifications
- **Twilio** - SMS delivery
- **Redis** - Rate limiting and deduplication
- **PostgreSQL** - Reminder persistence
- **pytz** - Timezone handling

---

## Project Structure

```
services/
└── notification/
    ├── main.py                      # FastAPI app entry
    ├── config.py                    # Service configuration
    ├── models/
    │   ├── __init__.py
    │   ├── reminder.py              # Reminder model
    │   ├── notification.py          # Notification log model
    │   └── user_preferences.py      # User notification preferences
    ├── services/
    │   ├── __init__.py
    │   ├── reminder_service.py      # Reminder business logic
    │   ├── scheduler.py             # APScheduler setup
    │   └── notification_service.py  # Notification dispatch
    ├── channels/
    │   ├── __init__.py
    │   ├── base.py                  # Base channel interface
    │   ├── email.py                 # Email channel (SendGrid)
    │   ├── push.py                  # Push channel (FCM)
    │   └── sms.py                   # SMS channel (Twilio)
    ├── consumers/
    │   ├── __init__.py
    │   └── event_consumer.py        # Kafka event consumer
    ├── routes/
    │   ├── __init__.py
    │   ├── reminders.py             # Reminder API endpoints
    │   └── preferences.py           # User preferences endpoints
    └── utils/
        ├── __init__.py
        ├── timezone.py              # Timezone utilities
        └── retry.py                 # Retry utilities
```

---

## Requirements

```txt
# requirements.txt
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
sqlmodel>=0.0.14
psycopg2-binary>=2.9.9
aiokafka>=0.10.0
apscheduler>=3.10.4
redis>=5.0.0
httpx>=0.26.0
python-jose[cryptography]>=3.3.0
python-dotenv>=1.0.0
pytz>=2024.1

# Notification channels
sendgrid>=6.11.0
firebase-admin>=6.4.0
twilio>=8.12.0
```

---

## Reminder Model

### Database Models

```python
# models/reminder.py
from datetime import datetime, time
from enum import Enum
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, JSON, func, Index
from pydantic import field_validator


class ReminderStatus(str, Enum):
    """Reminder lifecycle status."""
    PENDING = "pending"          # Scheduled, not yet triggered
    TRIGGERED = "triggered"      # Time reached, notification queued
    SENT = "sent"                # Notification delivered
    FAILED = "failed"            # Delivery failed after retries
    CANCELLED = "cancelled"      # User cancelled
    SNOOZED = "snoozed"          # User snoozed, new time set


class NotificationChannel(str, Enum):
    """Supported notification channels."""
    EMAIL = "email"
    PUSH = "push"
    SMS = "sms"
    IN_APP = "in_app"


class ReminderType(str, Enum):
    """Type of reminder."""
    TASK_DUE = "task_due"           # Task is due soon
    TASK_OVERDUE = "task_overdue"   # Task is past due
    SCHEDULED = "scheduled"          # User-scheduled reminder
    RECURRING = "recurring"          # Recurring reminder


class Reminder(SQLModel, table=True):
    """
    Reminder model for task notifications.

    CRITICAL: All queries MUST filter by user_id for isolation.
    """

    __tablename__ = "reminder"
    __table_args__ = (
        Index("ix_reminder_user_id", "user_id"),
        Index("ix_reminder_status", "status"),
        Index("ix_reminder_scheduled_time", "scheduled_time"),
        Index("ix_reminder_task_id", "task_id"),
        # Composite index for scheduled reminder checks
        Index(
            "ix_reminder_pending_scheduled",
            "status",
            "scheduled_time",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)

    # Task reference
    task_id: int = Field(nullable=False)
    task_title: str  # Denormalized for notification content

    # Reminder settings
    reminder_type: ReminderType = Field(default=ReminderType.SCHEDULED)
    scheduled_time: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    timezone: str = Field(default="UTC")

    # Notification settings
    channels: List[str] = Field(
        default=["email"],
        sa_column=Column(JSON),
    )
    message: Optional[str] = None  # Custom message (optional)

    # Snooze settings
    snooze_count: int = Field(default=0)
    max_snoozes: int = Field(default=3)
    snooze_until: Optional[datetime] = None

    # Status tracking
    status: ReminderStatus = Field(default=ReminderStatus.PENDING)
    triggered_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None

    # Retry tracking
    retry_count: int = Field(default=0)
    max_retries: int = Field(default=3)
    last_retry_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None

    # Metadata
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
        )
    )

    @field_validator("channels", mode="before")
    @classmethod
    def validate_channels(cls, v):
        if isinstance(v, str):
            return [v]
        valid_channels = {c.value for c in NotificationChannel}
        for channel in v:
            if channel not in valid_channels:
                raise ValueError(f"Invalid channel: {channel}")
        return v


class NotificationLog(SQLModel, table=True):
    """
    Log of all notification delivery attempts.

    Used for debugging, analytics, and retry tracking.
    """

    __tablename__ = "notification_log"
    __table_args__ = (
        Index("ix_notification_log_user_id", "user_id"),
        Index("ix_notification_log_reminder_id", "reminder_id"),
        Index("ix_notification_log_created_at", "created_at"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)
    reminder_id: int = Field(nullable=False)

    # Delivery details
    channel: NotificationChannel
    recipient: str  # Email, device token, or phone number
    subject: Optional[str] = None
    body: str

    # Status
    status: str  # "sent", "failed", "bounced", "delivered"
    provider_message_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    # Timing
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


class UserNotificationPreferences(SQLModel, table=True):
    """
    User preferences for notifications.
    """

    __tablename__ = "user_notification_preferences"

    user_id: str = Field(primary_key=True)

    # Channel preferences
    email_enabled: bool = Field(default=True)
    email_address: Optional[str] = None
    push_enabled: bool = Field(default=True)
    push_tokens: List[str] = Field(default=[], sa_column=Column(JSON))
    sms_enabled: bool = Field(default=False)
    phone_number: Optional[str] = None

    # Timing preferences
    timezone: str = Field(default="UTC")
    quiet_hours_start: Optional[time] = None  # e.g., 22:00
    quiet_hours_end: Optional[time] = None    # e.g., 08:00

    # Frequency preferences
    daily_digest: bool = Field(default=False)
    digest_time: Optional[time] = None  # Time to send daily digest

    # Task reminder defaults
    default_reminder_minutes: int = Field(default=30)  # 30 min before due
    default_channels: List[str] = Field(
        default=["email", "push"],
        sa_column=Column(JSON),
    )

    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
        )
    )
```

---

## Scheduled Checks

### APScheduler Configuration

```python
# services/scheduler.py
import logging
from datetime import datetime, timedelta
from typing import Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from apscheduler.jobstores.redis import RedisJobStore
from apscheduler.executors.asyncio import AsyncIOExecutor
import pytz

from config import settings

logger = logging.getLogger(__name__)


class ReminderScheduler:
    """
    Manages scheduled reminder checks using APScheduler.

    Jobs:
    1. Check for due reminders (every minute)
    2. Process retry queue (every 5 minutes)
    3. Send daily digests (configurable time)
    4. Cleanup old logs (daily at 3 AM)
    """

    def __init__(self, reminder_service, notification_service):
        self.reminder_service = reminder_service
        self.notification_service = notification_service
        self.scheduler: Optional[AsyncIOScheduler] = None

    def setup(self) -> AsyncIOScheduler:
        """Configure and return the scheduler."""
        # Job stores - use Redis for persistence across restarts
        jobstores = {
            "default": RedisJobStore(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
            )
        }

        # Executors
        executors = {
            "default": AsyncIOExecutor(),
        }

        # Job defaults
        job_defaults = {
            "coalesce": True,  # Combine missed runs into one
            "max_instances": 1,  # Only one instance at a time
            "misfire_grace_time": 60,  # Allow 60s late execution
        }

        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults,
            timezone=pytz.UTC,
        )

        # Add jobs
        self._add_jobs()

        return self.scheduler

    def _add_jobs(self) -> None:
        """Add scheduled jobs."""
        # Check for due reminders every minute
        self.scheduler.add_job(
            self.check_due_reminders,
            trigger=IntervalTrigger(minutes=1),
            id="check_due_reminders",
            name="Check Due Reminders",
            replace_existing=True,
        )

        # Process retry queue every 5 minutes
        self.scheduler.add_job(
            self.process_retry_queue,
            trigger=IntervalTrigger(minutes=5),
            id="process_retry_queue",
            name="Process Retry Queue",
            replace_existing=True,
        )

        # Check for overdue tasks every hour
        self.scheduler.add_job(
            self.check_overdue_tasks,
            trigger=IntervalTrigger(hours=1),
            id="check_overdue_tasks",
            name="Check Overdue Tasks",
            replace_existing=True,
        )

        # Cleanup old notification logs daily at 3 AM UTC
        self.scheduler.add_job(
            self.cleanup_old_logs,
            trigger=CronTrigger(hour=3, minute=0),
            id="cleanup_old_logs",
            name="Cleanup Old Logs",
            replace_existing=True,
        )

        logger.info("Scheduled jobs configured")

    async def check_due_reminders(self) -> None:
        """
        Check for reminders that are due and trigger notifications.

        Runs every minute.
        """
        logger.debug("Checking for due reminders...")

        try:
            # Get reminders due in the next minute
            now = datetime.now(pytz.UTC)
            window_end = now + timedelta(minutes=1)

            due_reminders = await self.reminder_service.get_due_reminders(
                before=window_end,
            )

            logger.info(f"Found {len(due_reminders)} due reminders")

            for reminder in due_reminders:
                try:
                    await self.notification_service.send_reminder(reminder)
                except Exception as e:
                    logger.error(
                        f"Failed to send reminder {reminder.id}: {e}"
                    )

        except Exception as e:
            logger.exception(f"Error checking due reminders: {e}")

    async def process_retry_queue(self) -> None:
        """
        Process reminders that need retry.

        Runs every 5 minutes.
        """
        logger.debug("Processing retry queue...")

        try:
            now = datetime.now(pytz.UTC)

            retry_reminders = await self.reminder_service.get_retry_reminders(
                before=now,
            )

            logger.info(f"Found {len(retry_reminders)} reminders to retry")

            for reminder in retry_reminders:
                try:
                    await self.notification_service.retry_reminder(reminder)
                except Exception as e:
                    logger.error(
                        f"Failed to retry reminder {reminder.id}: {e}"
                    )

        except Exception as e:
            logger.exception(f"Error processing retry queue: {e}")

    async def check_overdue_tasks(self) -> None:
        """
        Check for overdue tasks and create overdue reminders.

        Runs every hour.
        """
        logger.debug("Checking for overdue tasks...")

        try:
            await self.reminder_service.create_overdue_reminders()
        except Exception as e:
            logger.exception(f"Error checking overdue tasks: {e}")

    async def cleanup_old_logs(self) -> None:
        """
        Cleanup notification logs older than retention period.

        Runs daily at 3 AM.
        """
        logger.info("Cleaning up old notification logs...")

        try:
            retention_days = settings.LOG_RETENTION_DAYS
            cutoff = datetime.now(pytz.UTC) - timedelta(days=retention_days)

            deleted_count = await self.reminder_service.cleanup_logs(
                before=cutoff
            )

            logger.info(f"Deleted {deleted_count} old notification logs")

        except Exception as e:
            logger.exception(f"Error cleaning up logs: {e}")

    def start(self) -> None:
        """Start the scheduler."""
        if self.scheduler and not self.scheduler.running:
            self.scheduler.start()
            logger.info("Reminder scheduler started")

    def stop(self) -> None:
        """Stop the scheduler."""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=True)
            logger.info("Reminder scheduler stopped")
```

### Reminder Service

```python
# services/reminder_service.py
from datetime import datetime, timedelta
from typing import List, Optional
from sqlmodel import Session, select, delete
import pytz

from models.reminder import (
    Reminder,
    ReminderStatus,
    ReminderType,
    NotificationLog,
    UserNotificationPreferences,
)
from utils.timezone import TimezoneHelper


class ReminderService:
    """
    Service for managing reminders.

    Responsibilities:
    - Create/update/delete reminders
    - Query due reminders
    - Handle snoozing
    - Manage retry queue
    """

    def __init__(self, session: Session):
        self.session = session
        self.tz_helper = TimezoneHelper()

    async def create_reminder(
        self,
        user_id: str,
        task_id: int,
        task_title: str,
        scheduled_time: datetime,
        channels: List[str] = None,
        reminder_type: ReminderType = ReminderType.SCHEDULED,
        message: Optional[str] = None,
        timezone: str = "UTC",
    ) -> Reminder:
        """
        Create a new reminder.

        CRITICAL: scheduled_time should be in UTC.
        """
        # Get user preferences for defaults
        preferences = await self.get_user_preferences(user_id)

        if channels is None:
            channels = preferences.default_channels if preferences else ["email"]

        # Ensure time is in UTC
        if scheduled_time.tzinfo is None:
            user_tz = pytz.timezone(timezone)
            scheduled_time = user_tz.localize(scheduled_time)
        scheduled_time = scheduled_time.astimezone(pytz.UTC)

        reminder = Reminder(
            user_id=user_id,
            task_id=task_id,
            task_title=task_title,
            scheduled_time=scheduled_time,
            timezone=timezone,
            channels=channels,
            reminder_type=reminder_type,
            message=message,
            status=ReminderStatus.PENDING,
        )

        self.session.add(reminder)
        await self.session.commit()
        await self.session.refresh(reminder)

        return reminder

    async def get_due_reminders(
        self,
        before: datetime,
    ) -> List[Reminder]:
        """
        Get all pending reminders that are due.

        Args:
            before: Get reminders scheduled before this time

        Returns:
            List of due reminders
        """
        query = (
            select(Reminder)
            .where(Reminder.status == ReminderStatus.PENDING)
            .where(Reminder.scheduled_time <= before)
            .order_by(Reminder.scheduled_time.asc())
            .limit(100)  # Process in batches
        )

        result = await self.session.exec(query)
        return result.all()

    async def get_retry_reminders(
        self,
        before: datetime,
    ) -> List[Reminder]:
        """Get reminders that need retry."""
        query = (
            select(Reminder)
            .where(Reminder.status == ReminderStatus.TRIGGERED)
            .where(Reminder.next_retry_at <= before)
            .where(Reminder.retry_count < Reminder.max_retries)
            .order_by(Reminder.next_retry_at.asc())
            .limit(50)
        )

        result = await self.session.exec(query)
        return result.all()

    async def mark_triggered(self, reminder: Reminder) -> None:
        """Mark reminder as triggered."""
        reminder.status = ReminderStatus.TRIGGERED
        reminder.triggered_at = datetime.now(pytz.UTC)
        self.session.add(reminder)
        await self.session.commit()

    async def mark_sent(self, reminder: Reminder) -> None:
        """Mark reminder as successfully sent."""
        reminder.status = ReminderStatus.SENT
        reminder.sent_at = datetime.now(pytz.UTC)
        self.session.add(reminder)
        await self.session.commit()

    async def mark_failed(
        self,
        reminder: Reminder,
        reason: str,
        schedule_retry: bool = True,
    ) -> None:
        """
        Mark reminder as failed.

        Args:
            reminder: The reminder
            reason: Failure reason
            schedule_retry: Whether to schedule a retry
        """
        reminder.retry_count += 1
        reminder.last_retry_at = datetime.now(pytz.UTC)
        reminder.failure_reason = reason

        if schedule_retry and reminder.retry_count < reminder.max_retries:
            # Exponential backoff: 1, 2, 4, 8 minutes
            delay_minutes = 2 ** (reminder.retry_count - 1)
            reminder.next_retry_at = datetime.now(pytz.UTC) + timedelta(
                minutes=delay_minutes
            )
            reminder.status = ReminderStatus.TRIGGERED
        else:
            reminder.status = ReminderStatus.FAILED
            reminder.failed_at = datetime.now(pytz.UTC)

        self.session.add(reminder)
        await self.session.commit()

    async def snooze_reminder(
        self,
        reminder_id: int,
        user_id: str,
        snooze_minutes: int = 15,
    ) -> Optional[Reminder]:
        """
        Snooze a reminder.

        Args:
            reminder_id: Reminder ID
            user_id: User ID (for isolation)
            snooze_minutes: Minutes to snooze

        Returns:
            Updated reminder or None if max snoozes reached
        """
        reminder = await self.get_reminder(reminder_id, user_id)

        if not reminder:
            return None

        if reminder.snooze_count >= reminder.max_snoozes:
            return None

        # Calculate new time
        now = datetime.now(pytz.UTC)
        new_time = now + timedelta(minutes=snooze_minutes)

        reminder.snooze_count += 1
        reminder.snooze_until = new_time
        reminder.scheduled_time = new_time
        reminder.status = ReminderStatus.SNOOZED

        self.session.add(reminder)
        await self.session.commit()
        await self.session.refresh(reminder)

        return reminder

    async def cancel_reminder(
        self,
        reminder_id: int,
        user_id: str,
    ) -> bool:
        """Cancel a reminder."""
        reminder = await self.get_reminder(reminder_id, user_id)

        if not reminder:
            return False

        reminder.status = ReminderStatus.CANCELLED
        self.session.add(reminder)
        await self.session.commit()

        return True

    async def cancel_task_reminders(
        self,
        task_id: int,
        user_id: str,
    ) -> int:
        """Cancel all reminders for a task."""
        query = (
            select(Reminder)
            .where(Reminder.task_id == task_id)
            .where(Reminder.user_id == user_id)
            .where(Reminder.status == ReminderStatus.PENDING)
        )

        reminders = await self.session.exec(query)
        count = 0

        for reminder in reminders:
            reminder.status = ReminderStatus.CANCELLED
            self.session.add(reminder)
            count += 1

        await self.session.commit()
        return count

    async def get_reminder(
        self,
        reminder_id: int,
        user_id: str,
    ) -> Optional[Reminder]:
        """Get reminder with user isolation."""
        query = (
            select(Reminder)
            .where(Reminder.id == reminder_id)
            .where(Reminder.user_id == user_id)
        )
        return await self.session.exec(query).first()

    async def get_user_preferences(
        self,
        user_id: str,
    ) -> Optional[UserNotificationPreferences]:
        """Get user notification preferences."""
        return await self.session.get(UserNotificationPreferences, user_id)

    async def create_overdue_reminders(self) -> int:
        """
        Create reminders for overdue tasks.

        Called by scheduler to notify users of overdue tasks.
        """
        # This would query the task service for overdue tasks
        # and create TASK_OVERDUE reminders
        # Implementation depends on task service integration
        return 0

    async def cleanup_logs(self, before: datetime) -> int:
        """Delete notification logs older than cutoff date."""
        result = await self.session.exec(
            delete(NotificationLog)
            .where(NotificationLog.created_at < before)
        )
        await self.session.commit()
        return result.rowcount

    async def log_notification(
        self,
        reminder: Reminder,
        channel: str,
        recipient: str,
        subject: str,
        body: str,
        status: str,
        provider_message_id: Optional[str] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> NotificationLog:
        """Log a notification delivery attempt."""
        log = NotificationLog(
            user_id=reminder.user_id,
            reminder_id=reminder.id,
            channel=channel,
            recipient=recipient,
            subject=subject,
            body=body,
            status=status,
            provider_message_id=provider_message_id,
            error_code=error_code,
            error_message=error_message,
            sent_at=datetime.now(pytz.UTC) if status == "sent" else None,
        )

        self.session.add(log)
        await self.session.commit()

        return log
```

---

## Notification Channels

### Base Channel Interface

```python
# channels/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class DeliveryStatus(str, Enum):
    """Notification delivery status."""
    SENT = "sent"
    FAILED = "failed"
    QUEUED = "queued"
    BOUNCED = "bounced"
    DELIVERED = "delivered"


@dataclass
class NotificationResult:
    """Result of a notification delivery attempt."""
    success: bool
    status: DeliveryStatus
    provider_message_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


@dataclass
class NotificationPayload:
    """Notification content payload."""
    recipient: str  # Email, device token, or phone
    subject: str
    body: str
    html_body: Optional[str] = None  # For email
    data: Optional[dict] = None  # For push notifications
    priority: str = "normal"  # normal, high


class NotificationChannel(ABC):
    """
    Abstract base class for notification channels.

    All channel implementations must inherit from this class.
    """

    @property
    @abstractmethod
    def channel_name(self) -> str:
        """Return the channel name."""
        pass

    @abstractmethod
    async def send(self, payload: NotificationPayload) -> NotificationResult:
        """
        Send a notification.

        Args:
            payload: Notification content

        Returns:
            NotificationResult with delivery status
        """
        pass

    @abstractmethod
    async def validate_recipient(self, recipient: str) -> bool:
        """
        Validate recipient format.

        Args:
            recipient: Recipient identifier (email, phone, token)

        Returns:
            True if valid format
        """
        pass

    async def health_check(self) -> bool:
        """
        Check if the channel is healthy.

        Returns:
            True if channel is operational
        """
        return True
```

### Email Channel (SendGrid)

```python
# channels/email.py
import logging
from typing import Optional
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content, HtmlContent

from config import settings
from .base import (
    NotificationChannel,
    NotificationPayload,
    NotificationResult,
    DeliveryStatus,
)

logger = logging.getLogger(__name__)


class EmailChannel(NotificationChannel):
    """
    Email notification channel using SendGrid.

    Features:
    - HTML and plain text support
    - Template support
    - Delivery tracking
    """

    def __init__(self):
        self.client = sendgrid.SendGridAPIClient(
            api_key=settings.SENDGRID_API_KEY
        )
        self.from_email = settings.NOTIFICATION_FROM_EMAIL
        self.from_name = settings.NOTIFICATION_FROM_NAME

    @property
    def channel_name(self) -> str:
        return "email"

    async def send(self, payload: NotificationPayload) -> NotificationResult:
        """Send email via SendGrid."""
        try:
            message = Mail(
                from_email=Email(self.from_email, self.from_name),
                to_emails=To(payload.recipient),
                subject=payload.subject,
            )

            # Add plain text content
            message.add_content(Content("text/plain", payload.body))

            # Add HTML content if provided
            if payload.html_body:
                message.add_content(HtmlContent(payload.html_body))

            # Send email
            response = self.client.send(message)

            if response.status_code in (200, 201, 202):
                # Extract message ID from headers
                message_id = response.headers.get("X-Message-Id")

                logger.info(
                    f"Email sent successfully: {payload.recipient}, "
                    f"message_id={message_id}"
                )

                return NotificationResult(
                    success=True,
                    status=DeliveryStatus.SENT,
                    provider_message_id=message_id,
                )
            else:
                logger.error(
                    f"SendGrid error: {response.status_code} - {response.body}"
                )

                return NotificationResult(
                    success=False,
                    status=DeliveryStatus.FAILED,
                    error_code=str(response.status_code),
                    error_message=str(response.body),
                )

        except Exception as e:
            logger.exception(f"Failed to send email: {e}")

            return NotificationResult(
                success=False,
                status=DeliveryStatus.FAILED,
                error_message=str(e),
            )

    async def validate_recipient(self, recipient: str) -> bool:
        """Validate email format."""
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_pattern, recipient))

    async def health_check(self) -> bool:
        """Check SendGrid API connectivity."""
        try:
            # Simple API call to verify credentials
            response = self.client.client.api_keys.get()
            return response.status_code == 200
        except Exception:
            return False


class EmailTemplates:
    """Email template definitions."""

    @staticmethod
    def task_reminder(
        task_title: str,
        due_time: str,
        task_url: Optional[str] = None,
    ) -> tuple[str, str]:
        """
        Generate task reminder email content.

        Returns:
            Tuple of (plain_text, html)
        """
        plain_text = f"""
Reminder: {task_title}

This is a reminder that your task "{task_title}" is due {due_time}.

{'View task: ' + task_url if task_url else ''}

---
Sent by Todo Chatbot
        """.strip()

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }}
        .button {{ display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; }}
        .footer {{ margin-top: 20px; color: #6b7280; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Task Reminder</h1>
        </div>
        <div class="content">
            <h2>{task_title}</h2>
            <p>This is a reminder that your task is due <strong>{due_time}</strong>.</p>
            {f'<p><a href="{task_url}" class="button">View Task</a></p>' if task_url else ''}
        </div>
        <div class="footer">
            <p>Sent by Todo Chatbot</p>
        </div>
    </div>
</body>
</html>
        """.strip()

        return plain_text, html

    @staticmethod
    def task_overdue(
        task_title: str,
        overdue_since: str,
    ) -> tuple[str, str]:
        """Generate overdue task email."""
        plain_text = f"""
Overdue: {task_title}

Your task "{task_title}" is overdue since {overdue_since}.

Please complete or reschedule this task.

---
Sent by Todo Chatbot
        """.strip()

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
        .content {{ background: #fef2f2; padding: 20px; border-radius: 0 0 8px 8px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Task Overdue</h1>
        </div>
        <div class="content">
            <h2>{task_title}</h2>
            <p>Your task is overdue since <strong>{overdue_since}</strong>.</p>
            <p>Please complete or reschedule this task.</p>
        </div>
    </div>
</body>
</html>
        """.strip()

        return plain_text, html
```

### Push Channel (Firebase)

```python
# channels/push.py
import logging
from typing import Optional, List
import firebase_admin
from firebase_admin import credentials, messaging

from config import settings
from .base import (
    NotificationChannel,
    NotificationPayload,
    NotificationResult,
    DeliveryStatus,
)

logger = logging.getLogger(__name__)


class PushChannel(NotificationChannel):
    """
    Push notification channel using Firebase Cloud Messaging.

    Features:
    - iOS and Android support
    - Data messages
    - Notification priority
    - Token management
    """

    def __init__(self):
        # Initialize Firebase Admin SDK
        if not firebase_admin._apps:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)

    @property
    def channel_name(self) -> str:
        return "push"

    async def send(self, payload: NotificationPayload) -> NotificationResult:
        """Send push notification via FCM."""
        try:
            # Build message
            message = messaging.Message(
                notification=messaging.Notification(
                    title=payload.subject,
                    body=payload.body,
                ),
                token=payload.recipient,
                data=payload.data or {},
                android=messaging.AndroidConfig(
                    priority="high" if payload.priority == "high" else "normal",
                    notification=messaging.AndroidNotification(
                        icon="ic_notification",
                        color="#4F46E5",
                        click_action="OPEN_TASK",
                    ),
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(
                            badge=1,
                            sound="default",
                        ),
                    ),
                ),
            )

            # Send message
            response = messaging.send(message)

            logger.info(f"Push notification sent: {response}")

            return NotificationResult(
                success=True,
                status=DeliveryStatus.SENT,
                provider_message_id=response,
            )

        except messaging.UnregisteredError:
            # Token is invalid/expired
            logger.warning(f"Invalid FCM token: {payload.recipient}")

            return NotificationResult(
                success=False,
                status=DeliveryStatus.FAILED,
                error_code="UNREGISTERED",
                error_message="Device token is no longer valid",
            )

        except Exception as e:
            logger.exception(f"Failed to send push notification: {e}")

            return NotificationResult(
                success=False,
                status=DeliveryStatus.FAILED,
                error_message=str(e),
            )

    async def send_multicast(
        self,
        tokens: List[str],
        payload: NotificationPayload,
    ) -> dict:
        """
        Send push notification to multiple devices.

        Returns:
            Dict with success_count, failure_count, and failed_tokens
        """
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=payload.subject,
                    body=payload.body,
                ),
                tokens=tokens,
                data=payload.data or {},
            )

            response = messaging.send_each_for_multicast(message)

            failed_tokens = []
            for idx, send_response in enumerate(response.responses):
                if not send_response.success:
                    failed_tokens.append(tokens[idx])

            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count,
                "failed_tokens": failed_tokens,
            }

        except Exception as e:
            logger.exception(f"Failed to send multicast: {e}")
            return {
                "success_count": 0,
                "failure_count": len(tokens),
                "failed_tokens": tokens,
            }

    async def validate_recipient(self, recipient: str) -> bool:
        """Validate FCM token format."""
        # FCM tokens are typically 150+ characters
        return len(recipient) > 100

    async def health_check(self) -> bool:
        """Check FCM connectivity."""
        try:
            # Send a dry run message
            message = messaging.Message(
                topic="health_check",
            )
            messaging.send(message, dry_run=True)
            return True
        except Exception:
            return False
```

### SMS Channel (Twilio)

```python
# channels/sms.py
import logging
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException

from config import settings
from .base import (
    NotificationChannel,
    NotificationPayload,
    NotificationResult,
    DeliveryStatus,
)

logger = logging.getLogger(__name__)


class SMSChannel(NotificationChannel):
    """
    SMS notification channel using Twilio.

    Features:
    - International support
    - Delivery status callbacks
    - Message segmentation handling
    """

    def __init__(self):
        self.client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN,
        )
        self.from_number = settings.TWILIO_FROM_NUMBER

    @property
    def channel_name(self) -> str:
        return "sms"

    async def send(self, payload: NotificationPayload) -> NotificationResult:
        """Send SMS via Twilio."""
        try:
            # Twilio has 160 char limit for single SMS
            # Longer messages are split into multiple segments
            body = f"{payload.subject}\n\n{payload.body}"

            # Truncate if too long (Twilio handles segmentation but has limits)
            if len(body) > 1600:
                body = body[:1597] + "..."

            message = self.client.messages.create(
                body=body,
                from_=self.from_number,
                to=payload.recipient,
            )

            logger.info(
                f"SMS sent: {payload.recipient}, sid={message.sid}"
            )

            # Map Twilio status to our status
            status_map = {
                "queued": DeliveryStatus.QUEUED,
                "sending": DeliveryStatus.QUEUED,
                "sent": DeliveryStatus.SENT,
                "delivered": DeliveryStatus.DELIVERED,
                "failed": DeliveryStatus.FAILED,
                "undelivered": DeliveryStatus.FAILED,
            }

            return NotificationResult(
                success=message.status not in ("failed", "undelivered"),
                status=status_map.get(message.status, DeliveryStatus.QUEUED),
                provider_message_id=message.sid,
            )

        except TwilioRestException as e:
            logger.error(f"Twilio error: {e.code} - {e.msg}")

            return NotificationResult(
                success=False,
                status=DeliveryStatus.FAILED,
                error_code=str(e.code),
                error_message=e.msg,
            )

        except Exception as e:
            logger.exception(f"Failed to send SMS: {e}")

            return NotificationResult(
                success=False,
                status=DeliveryStatus.FAILED,
                error_message=str(e),
            )

    async def validate_recipient(self, recipient: str) -> bool:
        """Validate phone number format."""
        import re
        # E.164 format: +[country code][number]
        phone_pattern = r'^\+[1-9]\d{6,14}$'
        return bool(re.match(phone_pattern, recipient))

    async def health_check(self) -> bool:
        """Check Twilio API connectivity."""
        try:
            # Fetch account to verify credentials
            account = self.client.api.accounts(
                settings.TWILIO_ACCOUNT_SID
            ).fetch()
            return account.status == "active"
        except Exception:
            return False
```

---

## Retry Logic

### Retry Configuration and Implementation

```python
# utils/retry.py
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Callable, TypeVar, Optional, List
from functools import wraps
from dataclasses import dataclass
from enum import Enum
import random

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RetryStrategy(str, Enum):
    """Retry backoff strategies."""
    FIXED = "fixed"            # Same delay each time
    LINEAR = "linear"          # Delay increases linearly
    EXPONENTIAL = "exponential"  # Delay doubles each time
    EXPONENTIAL_JITTER = "exponential_jitter"  # Exponential with random jitter


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    max_attempts: int = 3
    initial_delay_seconds: float = 1.0
    max_delay_seconds: float = 300.0  # 5 minutes
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL_JITTER
    retryable_exceptions: tuple = (Exception,)
    non_retryable_exceptions: tuple = ()

    # Jitter settings (for EXPONENTIAL_JITTER)
    jitter_factor: float = 0.25  # +/- 25%


class RetryManager:
    """
    Manages retry logic for notification delivery.

    Features:
    - Multiple retry strategies
    - Configurable backoff
    - Jitter to prevent thundering herd
    - Exception filtering
    """

    def __init__(self, config: RetryConfig = None):
        self.config = config or RetryConfig()

    def calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay for given attempt number.

        Args:
            attempt: Current attempt number (1-based)

        Returns:
            Delay in seconds
        """
        if self.config.strategy == RetryStrategy.FIXED:
            delay = self.config.initial_delay_seconds

        elif self.config.strategy == RetryStrategy.LINEAR:
            delay = self.config.initial_delay_seconds * attempt

        elif self.config.strategy == RetryStrategy.EXPONENTIAL:
            delay = self.config.initial_delay_seconds * (2 ** (attempt - 1))

        elif self.config.strategy == RetryStrategy.EXPONENTIAL_JITTER:
            base_delay = self.config.initial_delay_seconds * (2 ** (attempt - 1))
            jitter = base_delay * self.config.jitter_factor
            delay = base_delay + random.uniform(-jitter, jitter)

        else:
            delay = self.config.initial_delay_seconds

        # Cap at max delay
        return min(delay, self.config.max_delay_seconds)

    def get_next_retry_time(self, attempt: int) -> datetime:
        """Get the datetime for next retry attempt."""
        delay = self.calculate_delay(attempt)
        return datetime.utcnow() + timedelta(seconds=delay)

    def should_retry(self, exception: Exception, attempt: int) -> bool:
        """
        Determine if we should retry after an exception.

        Args:
            exception: The exception that occurred
            attempt: Current attempt number

        Returns:
            True if we should retry
        """
        # Check if we've exceeded max attempts
        if attempt >= self.config.max_attempts:
            return False

        # Check if exception is in non-retryable list
        if isinstance(exception, self.config.non_retryable_exceptions):
            return False

        # Check if exception is in retryable list
        return isinstance(exception, self.config.retryable_exceptions)

    async def execute_with_retry(
        self,
        func: Callable[..., T],
        *args,
        **kwargs,
    ) -> T:
        """
        Execute a function with retry logic.

        Args:
            func: Async function to execute
            *args: Positional arguments
            **kwargs: Keyword arguments

        Returns:
            Function result

        Raises:
            Last exception if all retries fail
        """
        last_exception = None

        for attempt in range(1, self.config.max_attempts + 1):
            try:
                return await func(*args, **kwargs)

            except self.config.non_retryable_exceptions as e:
                # Don't retry these
                logger.error(f"Non-retryable error on attempt {attempt}: {e}")
                raise

            except self.config.retryable_exceptions as e:
                last_exception = e

                if attempt < self.config.max_attempts:
                    delay = self.calculate_delay(attempt)
                    logger.warning(
                        f"Attempt {attempt} failed, retrying in {delay:.1f}s: {e}"
                    )
                    await asyncio.sleep(delay)
                else:
                    logger.error(
                        f"All {self.config.max_attempts} attempts failed: {e}"
                    )

        raise last_exception


def with_retry(config: RetryConfig = None):
    """
    Decorator for adding retry logic to async functions.

    Usage:
        @with_retry(RetryConfig(max_attempts=3))
        async def send_notification():
            ...
    """
    manager = RetryManager(config or RetryConfig())

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            return await manager.execute_with_retry(func, *args, **kwargs)
        return wrapper

    return decorator


# Channel-specific retry configs
EMAIL_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay_seconds=60,  # 1 minute
    max_delay_seconds=3600,    # 1 hour
    strategy=RetryStrategy.EXPONENTIAL_JITTER,
    retryable_exceptions=(
        ConnectionError,
        TimeoutError,
    ),
    non_retryable_exceptions=(
        ValueError,  # Invalid email format
    ),
)

PUSH_RETRY_CONFIG = RetryConfig(
    max_attempts=2,
    initial_delay_seconds=5,
    max_delay_seconds=60,
    strategy=RetryStrategy.EXPONENTIAL,
    non_retryable_exceptions=(
        # FCM UnregisteredError - token invalid
    ),
)

SMS_RETRY_CONFIG = RetryConfig(
    max_attempts=2,
    initial_delay_seconds=30,
    max_delay_seconds=300,
    strategy=RetryStrategy.EXPONENTIAL_JITTER,
)
```

---

## Timezone Handling

### Timezone Utilities

```python
# utils/timezone.py
from datetime import datetime, time, timedelta
from typing import Optional, Tuple
import pytz
from zoneinfo import ZoneInfo


class TimezoneHelper:
    """
    Helper class for timezone operations.

    Handles:
    - Conversion between timezones
    - Quiet hours checking
    - User local time calculations
    - DST transitions
    """

    def __init__(self, default_timezone: str = "UTC"):
        self.default_timezone = pytz.timezone(default_timezone)

    def to_utc(
        self,
        dt: datetime,
        from_timezone: str,
    ) -> datetime:
        """
        Convert datetime from local timezone to UTC.

        Args:
            dt: Datetime (naive or aware)
            from_timezone: Source timezone string

        Returns:
            UTC datetime
        """
        tz = pytz.timezone(from_timezone)

        if dt.tzinfo is None:
            # Naive datetime - localize first
            try:
                dt = tz.localize(dt)
            except pytz.exceptions.AmbiguousTimeError:
                # DST transition - use standard time
                dt = tz.localize(dt, is_dst=False)
            except pytz.exceptions.NonExistentTimeError:
                # Spring forward - skip ahead
                dt = tz.localize(dt + timedelta(hours=1), is_dst=True)

        return dt.astimezone(pytz.UTC)

    def from_utc(
        self,
        dt: datetime,
        to_timezone: str,
    ) -> datetime:
        """
        Convert datetime from UTC to local timezone.

        Args:
            dt: UTC datetime
            to_timezone: Target timezone string

        Returns:
            Local datetime
        """
        if dt.tzinfo is None:
            dt = pytz.UTC.localize(dt)

        tz = pytz.timezone(to_timezone)
        return dt.astimezone(tz)

    def get_user_local_time(
        self,
        utc_time: datetime,
        user_timezone: str,
    ) -> datetime:
        """Get the current time in user's timezone."""
        return self.from_utc(utc_time, user_timezone)

    def is_quiet_hours(
        self,
        user_timezone: str,
        quiet_start: Optional[time],
        quiet_end: Optional[time],
        check_time: Optional[datetime] = None,
    ) -> bool:
        """
        Check if current time is within user's quiet hours.

        Args:
            user_timezone: User's timezone
            quiet_start: Quiet hours start time (e.g., 22:00)
            quiet_end: Quiet hours end time (e.g., 08:00)
            check_time: Time to check (default: now)

        Returns:
            True if within quiet hours
        """
        if quiet_start is None or quiet_end is None:
            return False

        # Get current time in user's timezone
        if check_time is None:
            check_time = datetime.now(pytz.UTC)

        local_time = self.from_utc(check_time, user_timezone).time()

        # Handle overnight quiet hours (e.g., 22:00 - 08:00)
        if quiet_start > quiet_end:
            # Quiet hours span midnight
            return local_time >= quiet_start or local_time < quiet_end
        else:
            # Quiet hours within same day
            return quiet_start <= local_time < quiet_end

    def get_next_active_time(
        self,
        user_timezone: str,
        quiet_start: Optional[time],
        quiet_end: Optional[time],
        from_time: Optional[datetime] = None,
    ) -> datetime:
        """
        Get the next time outside of quiet hours.

        Used to delay notifications until quiet hours end.

        Returns:
            UTC datetime when quiet hours end
        """
        if quiet_start is None or quiet_end is None:
            return from_time or datetime.now(pytz.UTC)

        if from_time is None:
            from_time = datetime.now(pytz.UTC)

        # Convert to user's local time
        tz = pytz.timezone(user_timezone)
        local_dt = self.from_utc(from_time, user_timezone)

        if not self.is_quiet_hours(user_timezone, quiet_start, quiet_end, from_time):
            # Not in quiet hours
            return from_time

        # Calculate when quiet hours end
        local_date = local_dt.date()

        if quiet_start > quiet_end:
            # Overnight quiet hours
            if local_dt.time() >= quiet_start:
                # After midnight, quiet ends today
                end_dt = datetime.combine(local_date + timedelta(days=1), quiet_end)
            else:
                # Before midnight, quiet ends today
                end_dt = datetime.combine(local_date, quiet_end)
        else:
            # Same-day quiet hours
            end_dt = datetime.combine(local_date, quiet_end)

        # Localize and convert to UTC
        end_dt = tz.localize(end_dt)
        return end_dt.astimezone(pytz.UTC)

    def format_relative_time(
        self,
        dt: datetime,
        user_timezone: str,
        reference: Optional[datetime] = None,
    ) -> str:
        """
        Format datetime as relative time string.

        Examples: "in 30 minutes", "tomorrow at 9:00 AM", "in 2 days"
        """
        if reference is None:
            reference = datetime.now(pytz.UTC)

        # Convert both to user's timezone
        local_dt = self.from_utc(dt, user_timezone)
        local_ref = self.from_utc(reference, user_timezone)

        diff = local_dt - local_ref

        if diff.total_seconds() < 0:
            return "overdue"

        if diff.days == 0:
            hours = diff.seconds // 3600
            minutes = (diff.seconds % 3600) // 60

            if hours == 0:
                if minutes <= 1:
                    return "in a moment"
                return f"in {minutes} minutes"
            elif hours == 1:
                return "in 1 hour"
            else:
                return f"in {hours} hours"

        elif diff.days == 1:
            return f"tomorrow at {local_dt.strftime('%I:%M %p')}"

        elif diff.days < 7:
            return f"in {diff.days} days"

        else:
            return local_dt.strftime("%B %d at %I:%M %p")

    @staticmethod
    def get_common_timezones() -> list:
        """Get list of common timezone options for UI."""
        return [
            ("America/New_York", "Eastern Time (US)"),
            ("America/Chicago", "Central Time (US)"),
            ("America/Denver", "Mountain Time (US)"),
            ("America/Los_Angeles", "Pacific Time (US)"),
            ("Europe/London", "London (GMT/BST)"),
            ("Europe/Paris", "Paris (CET/CEST)"),
            ("Europe/Berlin", "Berlin (CET/CEST)"),
            ("Asia/Tokyo", "Tokyo (JST)"),
            ("Asia/Shanghai", "Shanghai (CST)"),
            ("Asia/Kolkata", "India (IST)"),
            ("Australia/Sydney", "Sydney (AEST/AEDT)"),
            ("Pacific/Auckland", "Auckland (NZST/NZDT)"),
            ("UTC", "UTC"),
        ]

    @staticmethod
    def validate_timezone(timezone: str) -> bool:
        """Check if timezone string is valid."""
        try:
            pytz.timezone(timezone)
            return True
        except pytz.exceptions.UnknownTimeZoneError:
            return False
```

---

## Notification Service

### Main Notification Dispatcher

```python
# services/notification_service.py
import logging
from datetime import datetime
from typing import Dict, List, Optional
import pytz

from models.reminder import (
    Reminder,
    ReminderStatus,
    NotificationChannel as ChannelType,
    UserNotificationPreferences,
)
from channels.base import NotificationPayload, NotificationResult, DeliveryStatus
from channels.email import EmailChannel, EmailTemplates
from channels.push import PushChannel
from channels.sms import SMSChannel
from services.reminder_service import ReminderService
from utils.timezone import TimezoneHelper
from utils.retry import RetryManager, EMAIL_RETRY_CONFIG, PUSH_RETRY_CONFIG, SMS_RETRY_CONFIG

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Main service for dispatching notifications across channels.

    Responsibilities:
    - Channel selection based on user preferences
    - Quiet hours enforcement
    - Multi-channel delivery
    - Retry orchestration
    - Delivery logging
    """

    def __init__(self, reminder_service: ReminderService):
        self.reminder_service = reminder_service
        self.tz_helper = TimezoneHelper()

        # Initialize channels
        self.channels: Dict[str, object] = {
            "email": EmailChannel(),
            "push": PushChannel(),
            "sms": SMSChannel(),
        }

        # Retry managers per channel
        self.retry_managers = {
            "email": RetryManager(EMAIL_RETRY_CONFIG),
            "push": RetryManager(PUSH_RETRY_CONFIG),
            "sms": RetryManager(SMS_RETRY_CONFIG),
        }

    async def send_reminder(self, reminder: Reminder) -> bool:
        """
        Send reminder notification through configured channels.

        Args:
            reminder: The reminder to send

        Returns:
            True if at least one channel succeeded
        """
        logger.info(f"Sending reminder {reminder.id} for task {reminder.task_id}")

        # Mark as triggered
        await self.reminder_service.mark_triggered(reminder)

        # Get user preferences
        preferences = await self.reminder_service.get_user_preferences(
            reminder.user_id
        )

        # Check quiet hours
        if await self._is_quiet_hours(reminder, preferences):
            logger.info(
                f"Reminder {reminder.id} delayed due to quiet hours"
            )
            await self._reschedule_for_quiet_hours(reminder, preferences)
            return False

        # Prepare notification content
        content = self._build_content(reminder)

        # Send through each configured channel
        results: Dict[str, NotificationResult] = {}
        any_success = False

        for channel_name in reminder.channels:
            if not self._is_channel_enabled(channel_name, preferences):
                logger.debug(
                    f"Channel {channel_name} disabled for user {reminder.user_id}"
                )
                continue

            recipient = self._get_recipient(channel_name, preferences)
            if not recipient:
                logger.warning(
                    f"No recipient for channel {channel_name}, "
                    f"user {reminder.user_id}"
                )
                continue

            # Send notification
            result = await self._send_through_channel(
                channel_name,
                recipient,
                content,
            )

            results[channel_name] = result

            # Log the attempt
            await self.reminder_service.log_notification(
                reminder=reminder,
                channel=channel_name,
                recipient=recipient,
                subject=content["subject"],
                body=content["body"],
                status="sent" if result.success else "failed",
                provider_message_id=result.provider_message_id,
                error_code=result.error_code,
                error_message=result.error_message,
            )

            if result.success:
                any_success = True

        # Update reminder status
        if any_success:
            await self.reminder_service.mark_sent(reminder)
        else:
            await self.reminder_service.mark_failed(
                reminder,
                reason="All channels failed",
                schedule_retry=True,
            )

        return any_success

    async def retry_reminder(self, reminder: Reminder) -> bool:
        """Retry a failed reminder."""
        logger.info(f"Retrying reminder {reminder.id}, attempt {reminder.retry_count + 1}")

        return await self.send_reminder(reminder)

    async def _send_through_channel(
        self,
        channel_name: str,
        recipient: str,
        content: dict,
    ) -> NotificationResult:
        """Send through a specific channel with retry."""
        channel = self.channels.get(channel_name)
        retry_manager = self.retry_managers.get(channel_name)

        if not channel:
            return NotificationResult(
                success=False,
                status=DeliveryStatus.FAILED,
                error_message=f"Unknown channel: {channel_name}",
            )

        # Build payload
        payload = NotificationPayload(
            recipient=recipient,
            subject=content["subject"],
            body=content["body"],
            html_body=content.get("html_body"),
            data=content.get("data"),
        )

        try:
            # Execute with retry
            if retry_manager:
                return await retry_manager.execute_with_retry(
                    channel.send,
                    payload,
                )
            else:
                return await channel.send(payload)

        except Exception as e:
            logger.error(f"Channel {channel_name} failed: {e}")
            return NotificationResult(
                success=False,
                status=DeliveryStatus.FAILED,
                error_message=str(e),
            )

    def _build_content(self, reminder: Reminder) -> dict:
        """Build notification content from reminder."""
        # Format due time in user's timezone
        due_time = self.tz_helper.format_relative_time(
            reminder.scheduled_time,
            reminder.timezone,
        )

        # Use custom message or default
        if reminder.message:
            body = reminder.message
        else:
            body = f"Your task '{reminder.task_title}' is due {due_time}."

        subject = f"Reminder: {reminder.task_title}"

        # Generate HTML for email
        plain_text, html = EmailTemplates.task_reminder(
            task_title=reminder.task_title,
            due_time=due_time,
        )

        return {
            "subject": subject,
            "body": body,
            "html_body": html,
            "data": {
                "task_id": str(reminder.task_id),
                "reminder_id": str(reminder.id),
                "type": "task_reminder",
            },
        }

    async def _is_quiet_hours(
        self,
        reminder: Reminder,
        preferences: Optional[UserNotificationPreferences],
    ) -> bool:
        """Check if notification should be delayed for quiet hours."""
        if not preferences:
            return False

        return self.tz_helper.is_quiet_hours(
            user_timezone=preferences.timezone,
            quiet_start=preferences.quiet_hours_start,
            quiet_end=preferences.quiet_hours_end,
        )

    async def _reschedule_for_quiet_hours(
        self,
        reminder: Reminder,
        preferences: UserNotificationPreferences,
    ) -> None:
        """Reschedule reminder to after quiet hours end."""
        next_active = self.tz_helper.get_next_active_time(
            user_timezone=preferences.timezone,
            quiet_start=preferences.quiet_hours_start,
            quiet_end=preferences.quiet_hours_end,
        )

        reminder.scheduled_time = next_active
        reminder.status = ReminderStatus.PENDING
        await self.reminder_service.session.commit()

    def _is_channel_enabled(
        self,
        channel_name: str,
        preferences: Optional[UserNotificationPreferences],
    ) -> bool:
        """Check if channel is enabled for user."""
        if not preferences:
            return channel_name == "email"  # Default to email only

        channel_flags = {
            "email": preferences.email_enabled,
            "push": preferences.push_enabled,
            "sms": preferences.sms_enabled,
        }

        return channel_flags.get(channel_name, False)

    def _get_recipient(
        self,
        channel_name: str,
        preferences: Optional[UserNotificationPreferences],
    ) -> Optional[str]:
        """Get recipient for channel from preferences."""
        if not preferences:
            return None

        if channel_name == "email":
            return preferences.email_address

        elif channel_name == "push":
            # Return first push token (could be extended to send to all)
            return preferences.push_tokens[0] if preferences.push_tokens else None

        elif channel_name == "sms":
            return preferences.phone_number

        return None

    async def health_check(self) -> Dict[str, bool]:
        """Check health of all notification channels."""
        results = {}

        for name, channel in self.channels.items():
            try:
                results[name] = await channel.health_check()
            except Exception:
                results[name] = False

        return results
```

---

## API Endpoints

```python
# routes/reminders.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime

from models.reminder import Reminder, ReminderStatus
from services.reminder_service import ReminderService
from middleware.jwt_auth import verify_jwt_token, AuthenticatedUser, verify_user_access

router = APIRouter(prefix="/reminders", tags=["Reminders"])


@router.post("/{user_id}", response_model=dict)
async def create_reminder(
    user_id: str,
    task_id: int,
    task_title: str,
    scheduled_time: datetime,
    channels: List[str] = ["email"],
    message: Optional[str] = None,
    timezone: str = "UTC",
    service: ReminderService = Depends(get_reminder_service),
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    """Create a new reminder for a task."""
    verify_user_access(user_id, user)

    reminder = await service.create_reminder(
        user_id=user_id,
        task_id=task_id,
        task_title=task_title,
        scheduled_time=scheduled_time,
        channels=channels,
        message=message,
        timezone=timezone,
    )

    return {"id": reminder.id, "scheduled_time": reminder.scheduled_time}


@router.get("/{user_id}")
async def list_reminders(
    user_id: str,
    status: Optional[ReminderStatus] = None,
    task_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=100),
    service: ReminderService = Depends(get_reminder_service),
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    """List reminders for user."""
    verify_user_access(user_id, user)

    reminders = await service.get_user_reminders(
        user_id=user_id,
        status=status,
        task_id=task_id,
        limit=limit,
    )

    return {"items": reminders, "count": len(reminders)}


@router.post("/{user_id}/{reminder_id}/snooze")
async def snooze_reminder(
    user_id: str,
    reminder_id: int,
    minutes: int = Query(15, ge=5, le=120),
    service: ReminderService = Depends(get_reminder_service),
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    """Snooze a reminder."""
    verify_user_access(user_id, user)

    reminder = await service.snooze_reminder(
        reminder_id=reminder_id,
        user_id=user_id,
        snooze_minutes=minutes,
    )

    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot snooze: reminder not found or max snoozes reached",
        )

    return {
        "message": "Reminder snoozed",
        "new_time": reminder.scheduled_time,
        "snoozes_remaining": reminder.max_snoozes - reminder.snooze_count,
    }


@router.delete("/{user_id}/{reminder_id}")
async def cancel_reminder(
    user_id: str,
    reminder_id: int,
    service: ReminderService = Depends(get_reminder_service),
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    """Cancel a reminder."""
    verify_user_access(user_id, user)

    success = await service.cancel_reminder(reminder_id, user_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )

    return {"message": "Reminder cancelled"}


@router.get("/health")
async def notification_health(
    notification_service = Depends(get_notification_service),
):
    """Check notification system health."""
    channel_health = await notification_service.health_check()

    all_healthy = all(channel_health.values())

    return {
        "status": "healthy" if all_healthy else "degraded",
        "channels": channel_health,
    }
```

---

## FastAPI Application

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db import create_tables, get_session
from services.scheduler import ReminderScheduler
from services.reminder_service import ReminderService
from services.notification_service import NotificationService
from consumers.event_consumer import NotificationEventConsumer
from routes import reminders, preferences

# Global instances
scheduler: ReminderScheduler = None
consumer: NotificationEventConsumer = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    global scheduler, consumer

    # Startup
    print("Starting notification service...")

    # Create database tables
    create_tables()

    # Initialize services
    session = next(get_session())
    reminder_service = ReminderService(session)
    notification_service = NotificationService(reminder_service)

    # Start scheduler
    scheduler = ReminderScheduler(reminder_service, notification_service)
    scheduler.setup()
    scheduler.start()
    print("Scheduler started")

    # Start Kafka consumer
    consumer = NotificationEventConsumer(reminder_service, notification_service)
    await consumer.start()
    print("Event consumer started")

    yield

    # Shutdown
    print("Shutting down notification service...")

    if consumer:
        await consumer.stop()

    if scheduler:
        scheduler.stop()

    print("Notification service stopped")


app = FastAPI(
    title="Notification Service",
    description="Notification and reminder management service",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(reminders.router, prefix="/api")
app.include_router(preferences.router, prefix="/api")


@app.get("/health")
async def health_check():
    """Service health check."""
    return {"status": "healthy", "service": "notification"}
```

---

## Quick Reference

### Reminder Status Flow

```
PENDING ──────────────────────────────────────────┐
    │                                              │
    ▼ (scheduled time reached)                     │
TRIGGERED ─────────────────────────────────────┐  │
    │                                          │  │
    ├──► SENT (success)                        │  │
    │                                          │  │
    ├──► FAILED (all retries exhausted)        │  │
    │                                          │  │
    └──► (retry scheduled) ────────────────────┘  │
                                                  │
SNOOZED ──────────────────────────────────────────┘
    │
    └──► PENDING (snooze time reached)

CANCELLED (user action, can happen from PENDING/TRIGGERED/SNOOZED)
```

### Channel Comparison

| Channel | Latency | Reliability | Cost | Use Case |
|---------|---------|-------------|------|----------|
| Email | Low | High | Low | Default, detailed notifications |
| Push | Very Low | Medium | Free | Instant alerts, mobile users |
| SMS | Low | High | High | Critical, no internet required |

### Retry Schedule (Exponential Backoff)

| Attempt | Email | Push | SMS |
|---------|-------|------|-----|
| 1 | Immediate | Immediate | Immediate |
| 2 | +1 min | +5 sec | +30 sec |
| 3 | +2 min | +10 sec | +1 min |
| 4 | +4 min | - | - |

### Environment Variables

```bash
# Notification Service
SENDGRID_API_KEY=SG.xxx
NOTIFICATION_FROM_EMAIL=noreply@example.com
NOTIFICATION_FROM_NAME=Todo Chatbot

FIREBASE_CREDENTIALS_PATH=/path/to/firebase-credentials.json

TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1234567890

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

LOG_RETENTION_DAYS=30
```
