"""
MCP Tool: update_task

Updates/modifies an existing task. Used when the user wants to
change, update, modify, edit, or rename a task's title or description.
"""

import logging
from typing import Optional

from sqlmodel import Session, select

from app.models import Task
from app.services.chat.tools.base import ToolResult
from app.services.chat.tools.complete_task import find_task_by_identifier

logger = logging.getLogger(__name__)


async def handle_update_task(
    session: Session,
    user_id: str,
    task_id: Optional[int] = None,
    task_identifier: Optional[str] = None,
    new_title: Optional[str] = None,
    new_description: Optional[str] = None,
    **kwargs
) -> ToolResult:
    """
    Update an existing task.

    Args:
        session: Database session
        user_id: Owner's user ID (for isolation)
        task_id: Optional task ID
        task_identifier: Optional text to match task title
        new_title: Optional new title for the task
        new_description: Optional new description for the task

    Returns:
        ToolResult with update status
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
            message="Please specify which task to update"
        )

    # Check if there are any changes to make
    if new_title is None and new_description is None:
        return ToolResult(
            success=False,
            message="No changes specified. Provide a new title or description."
        )

    # Validate new title if provided
    if new_title is not None:
        new_title = new_title.strip()
        if not new_title:
            return ToolResult(
                success=False,
                message="New title cannot be empty"
            )
        if len(new_title) > 200:
            return ToolResult(
                success=False,
                message="New title exceeds 200 characters"
            )

    try:
        # Store previous values for response
        previous_title = task.title

        # Apply updates
        if new_title is not None:
            task.title = new_title
        if new_description is not None:
            task.description = new_description

        session.add(task)
        session.commit()
        session.refresh(task)

        logger.info(f"Updated task {task.id} for user {user_id}: {previous_title} -> {task.title}")

        # Build response message
        if new_title and new_title != previous_title:
            message = f"Task updated from '{previous_title}' to '{task.title}'"
        elif new_description is not None:
            message = f"Task '{task.title}' description updated"
        else:
            message = f"Task '{task.title}' updated"

        return ToolResult(
            success=True,
            message=message,
            data={
                "task_id": task.id,
                "status": "updated",
                "title": task.title,
                "previous_title": previous_title
            }
        )

    except Exception as e:
        logger.error(f"Failed to update task {task.id} for user {user_id}: {e}", exc_info=True)
        session.rollback()
        return ToolResult(
            success=False,
            message="Failed to update task. Please try again."
        )
