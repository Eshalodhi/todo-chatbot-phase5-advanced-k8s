"""
APScheduler setup for periodic reminder checks.

Runs minute-by-minute to check for due reminders and trigger notifications.
Per specs/phase5/plan.md.
"""

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import REMINDER_CHECK_INTERVAL_SECONDS
from app.queries import get_pending_reminders

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def check_due_reminders() -> None:
    """
    Check for reminders that are due and trigger notifications.

    Runs periodically via APScheduler. Queries for unsent reminders
    where remind_at <= now, then publishes reminder.triggered events.
    """
    now = datetime.now(timezone.utc)
    logger.debug(f"Checking for due reminders at {now.isoformat()}")

    try:
        reminders = await get_pending_reminders(now)

        if not reminders:
            return

        logger.info(f"Found {len(reminders)} due reminders")

        for reminder in reminders:
            logger.info(
                f"Triggering reminder {reminder['id']} for task {reminder['task_id']} "
                f"(user: {reminder['user_id']})"
            )
            # In production, publish reminder.triggered event to Kafka
            # For now, log it
            logger.info(f"Would publish reminder.triggered for reminder {reminder['id']}")

    except Exception as e:
        logger.error(f"Error checking due reminders: {e}", exc_info=True)


def start_scheduler() -> None:
    """Start the APScheduler for periodic reminder checks."""
    global _scheduler

    _scheduler = AsyncIOScheduler()
    _scheduler.add_job(
        check_due_reminders,
        "interval",
        seconds=REMINDER_CHECK_INTERVAL_SECONDS,
        id="check_due_reminders",
        name="Check for due reminders",
    )
    _scheduler.start()
    logger.info(
        f"Scheduler started, checking reminders every {REMINDER_CHECK_INTERVAL_SECONDS}s"
    )


def stop_scheduler() -> None:
    """Stop the APScheduler."""
    global _scheduler

    if _scheduler:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
