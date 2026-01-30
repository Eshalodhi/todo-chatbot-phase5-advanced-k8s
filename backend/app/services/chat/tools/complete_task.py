"""
MCP Tool: complete_task

Marks a task as complete/done. Used when the user indicates they have
finished, completed, done, or want to mark a task as done.
Publishes task.completed event for recurring task processing.
"""

import logging
from typing import Optional
from datetime import datetime, timezone

from sqlmodel import Session, select

from app.models import Task, Reminder
from app.services.chat.tools.base import ToolResult
from app.config import KAFKA_ENABLED

logger = logging.getLogger(__name__)


def find_task_by_identifier(
    session: Session,
    user_id: str,
    identifier: str
) -> tuple[Optional[Task], list[Task]]:
    """
    Find a task by partial title match.

    Args:
        session: Database session
        user_id: Owner's user ID
        identifier: Text to match against task titles

    Returns:
        (task, matches) - task if exactly one match, None otherwise with list of matches
    """
    # Case-insensitive partial match with user isolation
    query = (
        select(Task)
        .where(Task.user_id == user_id)
        .where(Task.title.ilike(f"%{identifier}%"))
    )
    matches = list(session.exec(query).all())

    if len(matches) == 1:
        return matches[0], matches
    return None, matches


async def handle_complete_task(
    session: Session,
    user_id: str,
    task_id: Optional[int] = None,
    task_identifier: Optional[str] = None,
    **kwargs
) -> ToolResult:
    """
    Mark a task as complete.

    Args:
        session: Database session
        user_id: Owner's user ID (for isolation)
        task_id: Optional task ID
        task_identifier: Optional text to match task title

    Returns:
        ToolResult with completion status
    """
    task: Optional[Task] = None

    # Find task by ID if provided
    if task_id is not None:
        query = (
            select(Task)
            .where(Task.id == task_id)
            .where(Task.user_id == user_id)  # User isolation
        )
        task = session.exec(query).first()

        if not task:
            return ToolResult(
                success=False,
                message=f"No task found with ID {task_id}"
            )

    # Find task by identifier if provided
    elif task_identifier:
        task, matches = find_task_by_identifier(session, user_id, task_identifier)

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

    else:
        return ToolResult(
            success=False,
            message="Please specify which task to complete"
        )

    # Check if already complete
    if task.is_completed:
        return ToolResult(
            success=False,
            message=f"Task '{task.title}' is already complete",
            data={"task_id": task.id}
        )

    try:
        # Mark as complete
        task.is_completed = True
        task.updated_at = datetime.now(timezone.utc)
        session.add(task)
        session.commit()
        session.refresh(task)

        completed_at = datetime.now(timezone.utc)
        logger.info(f"Completed task {task.id} for user {user_id}: {task.title}")

        # Cancel pending reminders for this task
        pending_reminders = list(session.exec(
            select(Reminder)
            .where(Reminder.task_id == task.id)
            .where(Reminder.user_id == user_id)
            .where(Reminder.sent == False)
        ).all())

        for reminder in pending_reminders:
            session.delete(reminder)
            logger.info(f"Cancelled reminder {reminder.id} for completed task {task.id}")

            # Publish reminder.cancelled event
            if KAFKA_ENABLED:
                try:
                    from app.events.publisher import publish_reminder_cancelled
                    await publish_reminder_cancelled(
                        user_id=user_id,
                        reminder_id=reminder.id,
                        reason="task_completed",
                        task_id=task.id,
                    )
                except Exception as e:
                    logger.warning(f"Failed to publish reminder.cancelled event: {e}")

        if pending_reminders:
            session.commit()

        # Publish task.completed event if Kafka is enabled
        had_recurrence = task.recurrence_pattern is not None
        if KAFKA_ENABLED:
            try:
                from app.events.publisher import publish_task_completed
                await publish_task_completed(
                    user_id=user_id,
                    task_id=task.id,
                    title=task.title,
                    completed_at=completed_at,
                    had_recurrence=had_recurrence,
                    recurrence_pattern=task.recurrence_pattern.value if task.recurrence_pattern else None,
                    recurrence_end_date=task.recurrence_end_date,
                )
            except Exception as e:
                logger.warning(f"Failed to publish task.completed event: {e}")

        response_data = {
            "task_id": task.id,
            "status": "completed",
            "title": task.title
        }
        if had_recurrence:
            response_data["had_recurrence"] = True
            response_data["recurrence_pattern"] = task.recurrence_pattern.value

        return ToolResult(
            success=True,
            message=f"Task '{task.title}' marked as complete",
            data=response_data
        )

    except Exception as e:
        logger.error(f"Failed to complete task {task.id} for user {user_id}: {e}", exc_info=True)
        session.rollback()
        return ToolResult(
            success=False,
            message="Failed to complete task. Please try again."
        )
