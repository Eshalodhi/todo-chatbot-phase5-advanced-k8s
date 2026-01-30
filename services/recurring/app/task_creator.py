"""
New task creation logic for recurring tasks.

Creates a new task instance when a recurring task is completed,
copying relevant fields and calculating the next due date.
Per specs/phase5/plan.md.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.calculator import calculate_next_occurrence

logger = logging.getLogger(__name__)


async def create_next_recurring_task(
    user_id: str,
    original_task_id: int,
    title: str,
    recurrence_pattern: str,
    recurrence_end_date: Optional[str] = None,
    current_due_date: Optional[str] = None,
    description: Optional[str] = None,
    priority: str = "medium",
) -> Optional[dict]:
    """
    Create the next instance of a recurring task.

    Args:
        user_id: Task owner
        original_task_id: ID of the completed task
        title: Task title to copy
        recurrence_pattern: daily/weekly/monthly
        recurrence_end_date: Optional end date for recurrence (ISO format)
        current_due_date: Current task's due date (ISO format)
        description: Optional task description
        priority: Task priority

    Returns:
        Dict with new task info, or None if recurrence has ended
    """
    # Parse dates
    due_date_dt = None
    if current_due_date:
        try:
            due_date_dt = datetime.fromisoformat(current_due_date.replace("Z", "+00:00"))
        except ValueError:
            pass

    end_date_dt = None
    if recurrence_end_date:
        try:
            end_date_dt = datetime.fromisoformat(recurrence_end_date.replace("Z", "+00:00"))
        except ValueError:
            pass

    # Calculate next due date
    completed_at = datetime.now(timezone.utc)
    next_due_date = calculate_next_occurrence(
        current_due_date=due_date_dt,
        recurrence_pattern=recurrence_pattern,
        completed_at=completed_at,
    )

    # Check if recurrence has ended
    if end_date_dt and next_due_date > end_date_dt:
        logger.info(
            f"Recurrence ended for task {original_task_id}: "
            f"next_due={next_due_date.isoformat()} > end={end_date_dt.isoformat()}"
        )
        return None

    # In production, this would create the task in the database
    # For now, log and return the task info
    new_task = {
        "user_id": user_id,
        "original_task_id": original_task_id,
        "title": title,
        "description": description,
        "priority": priority,
        "recurrence_pattern": recurrence_pattern,
        "recurrence_end_date": recurrence_end_date,
        "due_date": next_due_date.isoformat(),
    }

    logger.info(
        f"Would create new recurring task for user {user_id}: "
        f"title='{title}', due={next_due_date.isoformat()}, "
        f"pattern={recurrence_pattern}"
    )

    return new_task
