"""
MCP Tool: delete_task

Deletes/removes a task permanently. Used when the user wants to
delete, remove, cancel, or get rid of a task.
"""

import logging
from typing import Optional

from sqlmodel import Session, select

from app.models import Task
from app.services.chat.tools.base import ToolResult
from app.services.chat.tools.complete_task import find_task_by_identifier

logger = logging.getLogger(__name__)


async def handle_delete_task(
    session: Session,
    user_id: str,
    task_id: Optional[int] = None,
    task_identifier: Optional[str] = None,
    **kwargs
) -> ToolResult:
    """
    Delete a task permanently.

    Args:
        session: Database session
        user_id: Owner's user ID (for isolation)
        task_id: Optional task ID
        task_identifier: Optional text to match task title

    Returns:
        ToolResult with deletion status
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
            message="Please specify which task to delete"
        )

    try:
        # Store info before deletion
        task_title = task.title
        task_id_deleted = task.id

        # Delete the task
        session.delete(task)
        session.commit()

        logger.info(f"Deleted task {task_id_deleted} for user {user_id}: {task_title}")

        return ToolResult(
            success=True,
            message=f"Task '{task_title}' has been deleted",
            data={
                "task_id": task_id_deleted,
                "status": "deleted",
                "title": task_title
            }
        )

    except Exception as e:
        logger.error(f"Failed to delete task {task.id} for user {user_id}: {e}", exc_info=True)
        session.rollback()
        return ToolResult(
            success=False,
            message="Failed to delete task. Please try again."
        )
