"""
MCP Tool: add_task

Creates a new task for the user. Used when the user wants to add,
create, remember, or note something they need to do.
"""

import logging
from typing import Optional, List
from datetime import datetime

from sqlmodel import Session, select

from app.models import Task, Tag, TaskTag
from app.models import Priority, RecurrencePattern
from app.services.chat.tools.base import ToolResult
from app.config import KAFKA_ENABLED

logger = logging.getLogger(__name__)

# Valid priority values
VALID_PRIORITIES = {p.value for p in Priority}

# Valid recurrence patterns
VALID_RECURRENCE_PATTERNS = {p.value for p in RecurrencePattern}


async def handle_add_task(
    session: Session,
    user_id: str,
    title: str,
    description: Optional[str] = None,
    priority: Optional[str] = None,
    due_date: Optional[str] = None,
    recurrence_pattern: Optional[str] = None,
    recurrence_end_date: Optional[str] = None,
    tags: Optional[str] = None,
    **kwargs
) -> ToolResult:
    """
    Create a new task for the user.

    Args:
        session: Database session
        user_id: Owner's user ID (for isolation)
        title: Task title (required)
        description: Optional task description
        priority: Task priority (low/medium/high), defaults to medium
        due_date: Optional due date in ISO format
        recurrence_pattern: Optional recurrence pattern (daily/weekly/monthly)
        recurrence_end_date: Optional end date for recurrence in ISO format
        tags: Optional comma-separated tag names to assign

    Returns:
        ToolResult with created task data
    """
    # Validate title
    title = title.strip() if title else ""
    if not title:
        return ToolResult(
            success=False,
            message="Task title cannot be empty"
        )

    if len(title) > 200:
        return ToolResult(
            success=False,
            message="Task title exceeds 200 characters"
        )

    # Validate description if provided
    if description and len(description) > 1000:
        return ToolResult(
            success=False,
            message="Task description exceeds 1000 characters"
        )

    # Validate and parse priority
    task_priority = "medium"  # default
    if priority:
        priority_lower = priority.lower().strip()
        if priority_lower not in VALID_PRIORITIES:
            return ToolResult(
                success=False,
                message=f"Invalid priority. Use one of: {', '.join(VALID_PRIORITIES)}"
            )
        task_priority = priority_lower

    # Validate and parse due_date
    task_due_date: Optional[datetime] = None
    if due_date:
        try:
            # Handle ISO format strings
            task_due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        except ValueError:
            return ToolResult(
                success=False,
                message="Invalid due_date format. Use ISO format (e.g., 2024-12-31T10:00:00Z)"
            )

    # Validate recurrence pattern
    task_recurrence: Optional[RecurrencePattern] = None
    if recurrence_pattern:
        recurrence_lower = recurrence_pattern.lower().strip()
        if recurrence_lower not in VALID_RECURRENCE_PATTERNS:
            return ToolResult(
                success=False,
                message=f"Invalid recurrence pattern. Use one of: {', '.join(VALID_RECURRENCE_PATTERNS)}"
            )
        task_recurrence = RecurrencePattern(recurrence_lower)

    # Validate recurrence end date
    task_recurrence_end: Optional[datetime] = None
    if recurrence_end_date:
        try:
            task_recurrence_end = datetime.fromisoformat(recurrence_end_date.replace("Z", "+00:00"))
        except ValueError:
            return ToolResult(
                success=False,
                message="Invalid recurrence_end_date format. Use ISO format (e.g., 2024-12-31T23:59:59Z)"
            )

    try:
        # Create the task with user isolation
        task = Task(
            user_id=user_id,
            title=title,
            description=description,
            priority=task_priority,
            due_date=task_due_date,
            recurrence_pattern=task_recurrence,
            recurrence_end_date=task_recurrence_end
        )
        session.add(task)
        session.commit()
        session.refresh(task)

        # Handle tags if provided
        assigned_tags: List[str] = []
        if tags:
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

        logger.info(f"Created task {task.id} for user {user_id}: {title} (priority={task_priority}, tags={assigned_tags})")

        # Publish task.created event if Kafka is enabled
        if KAFKA_ENABLED:
            try:
                from app.events.publisher import publish_task_created
                await publish_task_created(
                    user_id=user_id,
                    task_id=task.id,
                    title=task.title,
                    description=task.description,
                    priority=task_priority,
                    due_date=task_due_date,
                )
            except Exception as e:
                # Log but don't fail the task creation
                logger.warning(f"Failed to publish task.created event: {e}")

        response_data = {
            "task_id": task.id,
            "status": "created",
            "title": task.title,
            "priority": task_priority
        }
        if task_due_date:
            response_data["due_date"] = task_due_date.isoformat()
        if task_recurrence:
            response_data["recurrence_pattern"] = task_recurrence.value
        if task_recurrence_end:
            response_data["recurrence_end_date"] = task_recurrence_end.isoformat()
        if assigned_tags:
            response_data["tags"] = assigned_tags

        message_parts = [f"Task '{title}' created successfully with {task_priority} priority"]
        if task_recurrence:
            message_parts.append(f"recurring {task_recurrence.value}")
        if assigned_tags:
            message_parts.append(f"tagged with: {', '.join(assigned_tags)}")

        return ToolResult(
            success=True,
            message=", ".join(message_parts),
            data=response_data
        )

    except Exception as e:
        logger.error(f"Failed to create task for user {user_id}: {e}", exc_info=True)
        session.rollback()
        return ToolResult(
            success=False,
            message="Failed to create task. Please try again."
        )
