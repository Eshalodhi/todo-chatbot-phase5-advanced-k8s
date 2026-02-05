"""
MCP Tool: update_task

Updates/modifies an existing task. Used when the user wants to
change, update, modify, edit, or rename a task's title or description.
"""

import logging
from typing import Optional

from typing import List
from sqlmodel import Session, select

from app.models import Task, Tag, TaskTag
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
    tags: Optional[str] = None,
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
        tags: Optional comma-separated tag names to assign (replaces existing)

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
    if new_title is None and new_description is None and tags is None:
        return ToolResult(
            success=False,
            message="No changes specified. Provide a new title, description, or tags."
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

        # Handle tags if provided
        assigned_tags: List[str] = []
        if tags is not None:
            # Remove existing tags
            existing_task_tags = list(session.exec(
                select(TaskTag).where(TaskTag.task_id == task.id)
            ).all())
            for tt in existing_task_tags:
                session.delete(tt)
            session.commit()

            # Add new tags
            if tags.strip():
                tag_names = [t.strip() for t in tags.split(",") if t.strip()]
                for tag_name in tag_names:
                    # Find or create tag
                    tag = session.exec(
                        select(Tag)
                        .where(Tag.user_id == user_id)
                        .where(Tag.name == tag_name)
                    ).first()

                    if not tag:
                        # Create new tag
                        tag = Tag(user_id=user_id, name=tag_name)
                        session.add(tag)
                        session.commit()
                        session.refresh(tag)

                    # Create task-tag association
                    task_tag = TaskTag(task_id=task.id, tag_id=tag.id)
                    session.add(task_tag)
                    assigned_tags.append(tag_name)

                if assigned_tags:
                    session.commit()

        logger.info(f"Updated task {task.id} for user {user_id}: {previous_title} -> {task.title}")

        # Build response message
        message_parts = []
        if new_title and new_title != previous_title:
            message_parts.append(f"Task updated from '{previous_title}' to '{task.title}'")
        elif new_description is not None:
            message_parts.append(f"Task '{task.title}' description updated")

        if tags is not None:
            if assigned_tags:
                message_parts.append(f"tags set to: {', '.join(assigned_tags)}")
            else:
                message_parts.append("tags cleared")

        if not message_parts:
            message_parts.append(f"Task '{task.title}' updated")

        response_data = {
            "task_id": task.id,
            "status": "updated",
            "title": task.title,
            "previous_title": previous_title
        }
        if assigned_tags:
            response_data["tags"] = assigned_tags

        return ToolResult(
            success=True,
            message=", ".join(message_parts),
            data=response_data
        )

    except Exception as e:
        logger.error(f"Failed to update task {task.id} for user {user_id}: {e}", exc_info=True)
        session.rollback()
        return ToolResult(
            success=False,
            message="Failed to update task. Please try again."
        )
