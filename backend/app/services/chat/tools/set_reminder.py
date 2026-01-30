"""
MCP Tool: set_reminder

Sets a reminder for a task at a specified time.
Used when the user wants to be reminded about a task.
"""

import logging
from typing import Optional
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models import Task, Reminder
from app.services.chat.tools.base import ToolResult
from app.config import KAFKA_ENABLED

logger = logging.getLogger(__name__)


async def handle_set_reminder(
    session: Session,
    user_id: str,
    task_id: Optional[int] = None,
    task_identifier: Optional[str] = None,
    remind_at: Optional[str] = None,
    **kwargs
) -> ToolResult:
    """
    Set a reminder for a task.

    Args:
        session: Database session
        user_id: Owner's user ID (for isolation)
        task_id: Optional task ID
        task_identifier: Optional text to match task title
        remind_at: When to send reminder (ISO 8601 format, required)

    Returns:
        ToolResult with reminder creation status
    """
    # Validate remind_at is provided
    if not remind_at:
        return ToolResult(
            success=False,
            message="Please specify when to send the reminder (remind_at in ISO format)"
        )

    # Parse remind_at
    try:
        remind_at_dt = datetime.fromisoformat(remind_at.replace("Z", "+00:00"))
    except ValueError:
        return ToolResult(
            success=False,
            message="Invalid remind_at format. Use ISO format (e.g., '2024-12-31T10:00:00Z')"
        )

    # Check reminder is in the future
    if remind_at_dt <= datetime.now(timezone.utc):
        return ToolResult(
            success=False,
            message="Reminder time must be in the future"
        )

    # Find the task
    task: Optional[Task] = None

    if task_id is not None:
        query = (
            select(Task)
            .where(Task.id == task_id)
            .where(Task.user_id == user_id)
        )
        task = session.exec(query).first()
        if not task:
            return ToolResult(
                success=False,
                message=f"No task found with ID {task_id}"
            )

    elif task_identifier:
        query = (
            select(Task)
            .where(Task.user_id == user_id)
            .where(Task.title.ilike(f"%{task_identifier}%"))
        )
        matches = list(session.exec(query).all())
        if not matches:
            return ToolResult(
                success=False,
                message=f"No task found matching '{task_identifier}'"
            )
        if len(matches) > 1:
            match_titles = [f"'{m.title}'" for m in matches[:5]]
            return ToolResult(
                success=False,
                message=f"Multiple tasks found matching '{task_identifier}'. Please be more specific.",
                data={"matches": match_titles}
            )
        task = matches[0]

    else:
        return ToolResult(
            success=False,
            message="Please specify which task to set a reminder for"
        )

    # Check if task is already completed
    if task.is_completed:
        return ToolResult(
            success=False,
            message=f"Task '{task.title}' is already complete. Cannot set a reminder for completed tasks."
        )

    try:
        # Create the reminder
        reminder = Reminder(
            task_id=task.id,
            user_id=user_id,
            remind_at=remind_at_dt
        )
        session.add(reminder)
        session.commit()
        session.refresh(reminder)

        logger.info(f"Created reminder {reminder.id} for task {task.id} at {remind_at_dt.isoformat()}")

        # Publish reminder.scheduled event if Kafka is enabled
        if KAFKA_ENABLED:
            try:
                from app.events.publisher import publish_reminder_scheduled
                await publish_reminder_scheduled(
                    user_id=user_id,
                    reminder_id=reminder.id,
                    task_id=task.id,
                    remind_at=remind_at_dt,
                    task_title=task.title,
                    task_due_date=task.due_date,
                )
            except Exception as e:
                logger.warning(f"Failed to publish reminder.scheduled event: {e}")

        return ToolResult(
            success=True,
            message=f"Reminder set for task '{task.title}' at {remind_at_dt.isoformat()}",
            data={
                "reminder_id": reminder.id,
                "task_id": task.id,
                "task_title": task.title,
                "remind_at": remind_at_dt.isoformat()
            }
        )

    except Exception as e:
        logger.error(f"Failed to set reminder for task {task.id}: {e}", exc_info=True)
        session.rollback()
        return ToolResult(
            success=False,
            message="Failed to set reminder. Please try again."
        )
