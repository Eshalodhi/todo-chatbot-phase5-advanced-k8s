"""
MCP Tool: list_tasks

Lists all tasks for the user with optional filtering and sorting.
Used when the user wants to see, view, show, or list their tasks.
"""

import logging
from typing import Optional
from datetime import datetime

from sqlmodel import Session, select

from app.models import Task, TaskTag, Tag
from app.models import Priority
from app.services.chat.tools.base import ToolResult

logger = logging.getLogger(__name__)

# Valid priority values
VALID_PRIORITIES = {p.value for p in Priority}

# Priority sort order (high=1, medium=2, low=3 for desc, reverse for asc)
PRIORITY_ORDER = {
    "high": 1,
    "medium": 2,
    "low": 3,
}


async def handle_list_tasks(
    session: Session,
    user_id: str,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    sort_by: Optional[str] = None,
    due_before: Optional[str] = None,
    due_after: Optional[str] = None,
    tags: Optional[str] = None,
    search: Optional[str] = None,
    **kwargs
) -> ToolResult:
    """
    List tasks for the user with optional filters and sorting.

    Args:
        session: Database session
        user_id: Owner's user ID (for isolation)
        status: Optional filter ("all", "pending", "completed")
        priority: Optional filter ("low", "medium", "high")
        sort_by: Optional sort field ("created_at", "due_date", "priority")
        due_before: Optional filter - tasks due before this date (ISO format)
        due_after: Optional filter - tasks due after this date (ISO format)
        tags: Optional comma-separated tag names to filter by
        search: Optional text to search in title and description

    Returns:
        ToolResult with list of tasks
    """
    # Default to "all" if not specified
    status = (status or "all").lower().strip()

    # Validate status
    valid_statuses = ["all", "pending", "completed"]
    if status not in valid_statuses:
        return ToolResult(
            success=False,
            message=f"Invalid status filter. Use one of: {', '.join(valid_statuses)}"
        )

    # Validate priority filter
    if priority:
        priority = priority.lower().strip()
        if priority not in VALID_PRIORITIES:
            return ToolResult(
                success=False,
                message=f"Invalid priority filter. Use one of: {', '.join(VALID_PRIORITIES)}"
            )

    # Validate sort_by
    valid_sort_fields = ["created_at", "due_date", "priority"]
    if sort_by:
        sort_by = sort_by.lower().strip()
        if sort_by not in valid_sort_fields:
            return ToolResult(
                success=False,
                message=f"Invalid sort_by. Use one of: {', '.join(valid_sort_fields)}"
            )

    # Parse date filters
    due_before_dt: Optional[datetime] = None
    due_after_dt: Optional[datetime] = None

    if due_before:
        try:
            due_before_dt = datetime.fromisoformat(due_before.replace("Z", "+00:00"))
        except ValueError:
            return ToolResult(
                success=False,
                message="Invalid due_before format. Use ISO format (e.g., 2024-12-31T23:59:59Z)"
            )

    if due_after:
        try:
            due_after_dt = datetime.fromisoformat(due_after.replace("Z", "+00:00"))
        except ValueError:
            return ToolResult(
                success=False,
                message="Invalid due_after format. Use ISO format (e.g., 2024-12-01T00:00:00Z)"
            )

    try:
        # Build query with user isolation
        query = select(Task).where(Task.user_id == user_id)

        # Apply status filter
        if status == "pending":
            query = query.where(Task.is_completed.is_(False))
        elif status == "completed":
            query = query.where(Task.is_completed.is_(True))

        # Apply priority filter
        if priority:
            query = query.where(Task.priority == priority.lower())

        # Apply due date filters
        if due_before_dt:
            query = query.where(Task.due_date.is_not(None)).where(Task.due_date <= due_before_dt)
        if due_after_dt:
            query = query.where(Task.due_date.is_not(None)).where(Task.due_date >= due_after_dt)

        # Apply text search filter
        if search:
            search_term = search.strip()
            query = query.where(
                (Task.title.ilike(f"%{search_term}%")) |
                (Task.description.ilike(f"%{search_term}%"))
            )

        # Execute query first, then sort in Python for priority (since it's an enum)
        tasks = list(session.exec(query).all())

        # Apply tag filter (post-query since it involves a join)
        if tags:
            tag_names = [t.strip().lower() for t in tags.split(",") if t.strip()]
            if tag_names:
                # Get task IDs that have ALL specified tags
                tagged_task_ids = set()
                for task in tasks:
                    task_tag_records = list(session.exec(
                        select(TaskTag).where(TaskTag.task_id == task.id)
                    ).all())
                    task_tag_ids = {tt.tag_id for tt in task_tag_records}
                    # Get tag names for these IDs
                    task_tag_names = set()
                    for tag_id in task_tag_ids:
                        tag_obj = session.get(Tag, tag_id)
                        if tag_obj:
                            task_tag_names.add(tag_obj.name.lower())
                    # Check if task has any of the requested tags
                    if task_tag_names & set(tag_names):
                        tagged_task_ids.add(task.id)
                tasks = [t for t in tasks if t.id in tagged_task_ids]

        # Apply sorting
        if sort_by == "priority":
            # Sort by priority: high first, then medium, then low
            tasks.sort(key=lambda t: PRIORITY_ORDER.get(t.priority.lower() if t.priority else "medium", 99))
        elif sort_by == "due_date":
            # Sort by due date, nulls last
            tasks.sort(key=lambda t: (t.due_date is None, t.due_date or datetime.max))
        else:
            # Default: sort by created_at descending (newest first)
            tasks.sort(key=lambda t: t.created_at, reverse=True)

        # Build filter description
        filters_applied = []
        if status != "all":
            filters_applied.append(f"status={status}")
        if priority:
            filters_applied.append(f"priority={priority}")
        if due_before_dt:
            filters_applied.append(f"due_before={due_before}")
        if due_after_dt:
            filters_applied.append(f"due_after={due_after}")

        filter_desc = f" (filters: {', '.join(filters_applied)})" if filters_applied else ""
        logger.info(f"Listed {len(tasks)} tasks for user {user_id}{filter_desc}")

        # Format tasks for response with tags
        task_list = []
        for task in tasks:
            # Get tags for this task
            task_tag_records = list(session.exec(
                select(TaskTag).where(TaskTag.task_id == task.id)
            ).all())
            task_tags = []
            for tt in task_tag_records:
                tag_obj = session.get(Tag, tt.tag_id)
                if tag_obj:
                    task_tags.append({"id": tag_obj.id, "name": tag_obj.name, "color": tag_obj.color})

            task_list.append({
                "id": task.id,
                "title": task.title,
                "description": task.description,
                "is_completed": task.is_completed,
                "priority": (task.priority.lower() if task.priority else "medium"),
                "due_date": task.due_date.isoformat() if task.due_date else None,
                "created_at": task.created_at.isoformat(),
                "tags": task_tags
            })

        # Build response message
        if not tasks:
            if status == "pending":
                message = "You have no pending tasks. Great job!"
            elif status == "completed":
                message = "You haven't completed any tasks yet."
            elif priority:
                message = f"You don't have any {priority} priority tasks."
            else:
                message = "You don't have any tasks yet. Would you like to create one?"
        else:
            count_word = "task" if len(tasks) == 1 else "tasks"
            if status == "pending":
                message = f"Found {len(tasks)} pending {count_word}"
            elif status == "completed":
                message = f"Found {len(tasks)} completed {count_word}"
            elif priority:
                message = f"Found {len(tasks)} {priority} priority {count_word}"
            else:
                message = f"Found {len(tasks)} {count_word}"

        return ToolResult(
            success=True,
            message=message,
            data={
                "tasks": task_list,
                "count": len(tasks),
                "filter": status,
                "priority_filter": priority,
                "sort_by": sort_by or "created_at"
            }
        )

    except Exception as e:
        logger.error(f"Failed to list tasks for user {user_id}: {e}", exc_info=True)
        return ToolResult(
            success=False,
            message="Failed to retrieve tasks. Please try again."
        )
