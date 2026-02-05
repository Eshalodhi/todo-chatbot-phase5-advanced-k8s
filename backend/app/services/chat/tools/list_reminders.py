"""
MCP Tool: list_reminders

Lists reminders for the user's tasks.
Used when the user wants to see their upcoming reminders.
"""

import logging
from typing import Optional

from sqlmodel import Session, select

from app.models import Task, Reminder
from app.services.chat.tools.base import ToolResult

logger = logging.getLogger(__name__)


async def handle_list_reminders(
    session: Session,
    user_id: str,
    task_id: Optional[int] = None,
    include_sent: Optional[bool] = False,
    **kwargs
) -> ToolResult:
    """
    List reminders for the user.

    Args:
        session: Database session
        user_id: Owner's user ID (for isolation)
        task_id: Optional task ID to filter by
        include_sent: Whether to include already-sent reminders

    Returns:
        ToolResult with list of reminders
    """
    try:
        # Build query with user isolation
        query = select(Reminder).where(Reminder.user_id == user_id)

        # Filter by task if specified
        if task_id:
            query = query.where(Reminder.task_id == task_id)

        # Filter out sent reminders by default
        if not include_sent:
            query = query.where(Reminder.sent.is_(False))

        # Order by remind_at (soonest first)
        query = query.order_by(Reminder.remind_at.asc())

        reminders = list(session.exec(query).all())

        # Get task titles for each reminder
        reminder_list = []
        for reminder in reminders:
            task = session.get(Task, reminder.task_id)
            reminder_list.append({
                "reminder_id": reminder.id,
                "task_id": reminder.task_id,
                "task_title": task.title if task else "Unknown task",
                "remind_at": reminder.remind_at.isoformat(),
                "sent": reminder.sent,
                "sent_at": reminder.sent_at.isoformat() if reminder.sent_at else None
            })

        logger.info(f"Listed {len(reminders)} reminders for user {user_id}")

        if not reminders:
            message = "You don't have any upcoming reminders."
        else:
            count_word = "reminder" if len(reminders) == 1 else "reminders"
            message = f"Found {len(reminders)} {count_word}"

        return ToolResult(
            success=True,
            message=message,
            data={
                "reminders": reminder_list,
                "count": len(reminders)
            }
        )

    except Exception as e:
        logger.error(f"Failed to list reminders for user {user_id}: {e}", exc_info=True)
        return ToolResult(
            success=False,
            message="Failed to retrieve reminders. Please try again."
        )
