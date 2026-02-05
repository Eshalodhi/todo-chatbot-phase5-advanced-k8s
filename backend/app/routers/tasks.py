"""Task CRUD API endpoints."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, or_

from app.auth import verify_jwt_token, verify_user_access
from app.database import get_session
from app.models import Task, RecurrencePattern, Tag, TaskTag
from app.schemas import (
    CreateTaskDTO,
    UpdateTaskDTO,
    TaskResponseDTO,
    TaskListResponseDTO,
    TaskTagResponseDTO,
)

router = APIRouter(prefix="/api", tags=["Tasks"])


def _get_task_tags(session: Session, task_id: int) -> List[TaskTagResponseDTO]:
    """Get tags for a task."""
    task_tags = session.exec(
        select(TaskTag, Tag)
        .join(Tag, TaskTag.tag_id == Tag.id)
        .where(TaskTag.task_id == task_id)
    ).all()
    return [
        TaskTagResponseDTO(id=tag.id, name=tag.name, color=tag.color)
        for task_tag, tag in task_tags
    ]


def _task_to_response(session: Session, task: Task) -> TaskResponseDTO:
    """Convert Task model to TaskResponseDTO with tags."""
    tags = _get_task_tags(session, task.id)
    return TaskResponseDTO(
        id=task.id,
        user_id=task.user_id,
        title=task.title,
        description=task.description,
        is_completed=task.is_completed,
        priority=task.priority,
        due_date=task.due_date.isoformat() if task.due_date else None,
        recurrence_pattern=task.recurrence_pattern.value if task.recurrence_pattern else None,
        recurrence_end_date=task.recurrence_end_date.isoformat() if task.recurrence_end_date else None,
        tags=tags,
        created_at=task.created_at.isoformat(),
        updated_at=task.updated_at.isoformat(),
    )


# =============================================================================
# US2: View My Tasks - GET /api/{user_id}/tasks
# =============================================================================

@router.get("/{user_id}/tasks", response_model=TaskListResponseDTO)
async def get_tasks(
    user_id: str,
    search: Optional[str] = Query(None, description="Search in title and description"),
    priority: Optional[str] = Query(None, description="Filter by priority (low, medium, high)"),
    tags: Optional[List[str]] = Query(None, description="Filter by tag names"),
    is_completed: Optional[bool] = Query(None, description="Filter by completion status"),
    sort_by: Optional[str] = Query("created_at", description="Sort field: created_at, priority, due_date, title"),
    order: Optional[str] = Query("desc", description="Sort order: asc, desc"),
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> TaskListResponseDTO:
    """
    List all tasks for the authenticated user with search, filter, and sort.

    Query Parameters:
    - search: Search text in title and description
    - priority: Filter by priority level (low, medium, high)
    - tags: Filter by tag names (tasks must have ALL specified tags)
    - is_completed: Filter by completion status
    - sort_by: Sort field (created_at, priority, due_date, title)
    - order: Sort order (asc, desc)

    Returns only tasks belonging to the authenticated user (user isolation).
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Start building query
    statement = select(Task).where(Task.user_id == user_id)

    # Apply search filter
    if search:
        search_term = f"%{search}%"
        statement = statement.where(
            or_(
                Task.title.ilike(search_term),
                Task.description.ilike(search_term)
            )
        )

    # Apply priority filter
    if priority:
        if priority not in ["low", "medium", "high"]:
            raise HTTPException(status_code=400, detail="Invalid priority. Use: low, medium, high")
        statement = statement.where(Task.priority == priority)

    # Apply completion filter
    if is_completed is not None:
        statement = statement.where(Task.is_completed == is_completed)

    # Apply sorting
    valid_sort_fields = {"created_at", "priority", "due_date", "title"}
    if sort_by not in valid_sort_fields:
        sort_by = "created_at"

    sort_column = getattr(Task, sort_by)
    if order == "asc":
        statement = statement.order_by(sort_column.asc())
    else:
        statement = statement.order_by(sort_column.desc())

    # Execute query
    tasks = list(session.exec(statement).all())

    # Filter by tags if specified (post-query filtering for many-to-many)
    if tags:
        filtered_tasks = []
        for task in tasks:
            task_tag_names = {
                tag.name for tag in _get_task_tags(session, task.id)
            }
            # Task must have ALL specified tags
            if all(tag_name in task_tag_names for tag_name in tags):
                filtered_tasks.append(task)
        tasks = filtered_tasks

    # Convert to response DTOs with tags
    task_responses = [_task_to_response(session, task) for task in tasks]

    return TaskListResponseDTO(tasks=task_responses, count=len(task_responses))


# =============================================================================
# US3: Create a New Task - POST /api/{user_id}/tasks
# =============================================================================

@router.post("/{user_id}/tasks", response_model=TaskResponseDTO, status_code=201)
async def create_task(
    user_id: str,
    data: CreateTaskDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> TaskResponseDTO:
    """
    Create a new task for the authenticated user.

    The task is automatically associated with the authenticated user
    and marked as not completed. Optionally assign tags by name.
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Parse due_date if provided
    task_due_date = None
    if data.due_date:
        try:
            task_due_date = datetime.fromisoformat(data.due_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid due_date format. Use ISO 8601.")

    # Parse recurrence_end_date if provided
    task_recurrence_end = None
    if data.recurrence_end_date:
        try:
            task_recurrence_end = datetime.fromisoformat(data.recurrence_end_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid recurrence_end_date format. Use ISO 8601.")

    # Create task with user_id and defaults
    task = Task(
        user_id=user_id,
        title=data.title,
        description=data.description,
        is_completed=False,
        priority=data.priority or "medium",
        due_date=task_due_date,
        recurrence_pattern=RecurrencePattern(data.recurrence_pattern) if data.recurrence_pattern else None,
        recurrence_end_date=task_recurrence_end,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    # Persist to database
    session.add(task)
    session.commit()
    session.refresh(task)

    # Handle tags if provided
    if data.tags:
        _assign_tags_to_task(session, user_id, task.id, data.tags)

    return _task_to_response(session, task)


def _assign_tags_to_task(session: Session, user_id: str, task_id: int, tag_names: List[str]) -> None:
    """Assign tags to a task by name, creating tags if they don't exist."""
    # Remove existing tag associations
    existing_assocs = list(session.exec(
        select(TaskTag).where(TaskTag.task_id == task_id)
    ).all())
    for assoc in existing_assocs:
        session.delete(assoc)

    # Add new tags
    for tag_name in tag_names:
        tag_name = tag_name.strip()
        if not tag_name:
            continue

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

        # Create association
        task_tag = TaskTag(task_id=task_id, tag_id=tag.id)
        session.add(task_tag)

    session.commit()


# =============================================================================
# US6: Get Single Task Details - GET /api/{user_id}/tasks/{task_id}
# =============================================================================

@router.get("/{user_id}/tasks/{task_id}", response_model=TaskResponseDTO)
async def get_task(
    user_id: str,
    task_id: int,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> TaskResponseDTO:
    """
    Get details of a specific task owned by the authenticated user.
    Includes all Phase V fields and assigned tags.
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Fetch task by id
    task = session.get(Task, task_id)

    # Verify task exists and belongs to user
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    return _task_to_response(session, task)


# =============================================================================
# US4: Update an Existing Task - PATCH /api/{user_id}/tasks/{task_id}
# =============================================================================

@router.patch("/{user_id}/tasks/{task_id}", response_model=TaskResponseDTO)
async def update_task(
    user_id: str,
    task_id: int,
    data: UpdateTaskDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> TaskResponseDTO:
    """
    Update a task's fields including Phase V features.

    Partial updates are supported - only provided fields are updated.
    Send empty string for due_date/recurrence_end_date to clear them.
    Tags field replaces all existing tags when provided.
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Fetch task by id
    task = session.get(Task, task_id)

    # Verify task exists and belongs to user
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    # Apply partial update with date parsing
    update_data = data.model_dump(exclude_unset=True)

    # Handle tags separately
    tags_to_assign = update_data.pop("tags", None)

    _apply_task_update(task, update_data)

    # Update timestamp
    task.updated_at = datetime.utcnow()

    # Persist changes
    session.add(task)
    session.commit()
    session.refresh(task)

    # Handle tags if provided
    if tags_to_assign is not None:
        _assign_tags_to_task(session, user_id, task.id, tags_to_assign)

    return _task_to_response(session, task)


# =============================================================================
# US4 (alt): Update an Existing Task - PUT /api/{user_id}/tasks/{task_id}
# =============================================================================

@router.put("/{user_id}/tasks/{task_id}", response_model=TaskResponseDTO)
async def update_task_put(
    user_id: str,
    task_id: int,
    data: UpdateTaskDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> TaskResponseDTO:
    """
    Update a task (PUT variant - same as PATCH for convenience).
    Tags field replaces all existing tags when provided.
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Fetch task by id
    task = session.get(Task, task_id)

    # Verify task exists and belongs to user
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    # Apply partial update with date parsing
    update_data = data.model_dump(exclude_unset=True)

    # Handle tags separately
    tags_to_assign = update_data.pop("tags", None)

    _apply_task_update(task, update_data)

    # Update timestamp
    task.updated_at = datetime.utcnow()

    # Persist changes
    session.add(task)
    session.commit()
    session.refresh(task)

    # Handle tags if provided
    if tags_to_assign is not None:
        _assign_tags_to_task(session, user_id, task.id, tags_to_assign)

    return _task_to_response(session, task)


def _apply_task_update(task: Task, update_data: dict) -> None:
    """Apply update fields to a task, parsing dates and enums as needed."""
    date_fields = {"due_date", "recurrence_end_date"}
    for key, value in update_data.items():
        if key in date_fields:
            if value == "" or value is None:
                setattr(task, key, None)
            else:
                try:
                    setattr(task, key, datetime.fromisoformat(value.replace("Z", "+00:00")))
                except ValueError:
                    raise HTTPException(status_code=400, detail=f"Invalid {key} format. Use ISO 8601.")
        elif key == "recurrence_pattern":
            if value is None or value == "":
                task.recurrence_pattern = None
            else:
                task.recurrence_pattern = RecurrencePattern(value)
        else:
            setattr(task, key, value)


# =============================================================================
# Toggle Task Completion - PATCH /api/{user_id}/tasks/{task_id}/complete
# =============================================================================

@router.patch("/{user_id}/tasks/{task_id}/complete", response_model=TaskResponseDTO)
async def toggle_task_complete(
    user_id: str,
    task_id: int,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> TaskResponseDTO:
    """
    Toggle the completion status of a task.
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Fetch task by id
    task = session.get(Task, task_id)

    # Verify task exists and belongs to user
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    # Toggle completion
    task.is_completed = not task.is_completed
    task.updated_at = datetime.utcnow()

    # Persist changes
    session.add(task)
    session.commit()
    session.refresh(task)

    return _task_to_response(session, task)


# =============================================================================
# US5: Delete a Task - DELETE /api/{user_id}/tasks/{task_id}
# =============================================================================

@router.delete("/{user_id}/tasks/{task_id}", status_code=204)
async def delete_task(
    user_id: str,
    task_id: int,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> None:
    """
    Delete a task permanently.

    Only the task owner can delete their own tasks.
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Fetch task by id
    task = session.get(Task, task_id)

    # Verify task exists and belongs to user
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    # Delete task
    session.delete(task)
    session.commit()
