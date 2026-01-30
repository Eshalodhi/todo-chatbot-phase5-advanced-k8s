"""Task CRUD API endpoints."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import verify_jwt_token, verify_user_access
from app.database import get_session
from app.models import Task
from app.schemas import CreateTaskDTO, UpdateTaskDTO

router = APIRouter(prefix="/api", tags=["Tasks"])


# =============================================================================
# US2: View My Tasks - GET /api/{user_id}/tasks
# =============================================================================

@router.get("/{user_id}/tasks", response_model=List[Task])
async def get_tasks(
    user_id: str,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> List[Task]:
    """
    List all tasks for the authenticated user.

    Returns only tasks belonging to the authenticated user (user isolation).
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Query tasks filtered by user_id
    statement = select(Task).where(Task.user_id == user_id)
    tasks = session.exec(statement).all()

    return list(tasks)


# =============================================================================
# US3: Create a New Task - POST /api/{user_id}/tasks
# =============================================================================

@router.post("/{user_id}/tasks", response_model=Task, status_code=201)
async def create_task(
    user_id: str,
    data: CreateTaskDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> Task:
    """
    Create a new task for the authenticated user.

    The task is automatically associated with the authenticated user
    and marked as not completed.
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Create task with user_id and defaults
    task = Task(
        user_id=user_id,
        title=data.title,
        description=data.description,
        is_completed=False,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    # Persist to database
    session.add(task)
    session.commit()
    session.refresh(task)

    return task


# =============================================================================
# US6: Get Single Task Details - GET /api/{user_id}/tasks/{task_id}
# =============================================================================

@router.get("/{user_id}/tasks/{task_id}", response_model=Task)
async def get_task(
    user_id: str,
    task_id: int,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> Task:
    """
    Get details of a specific task owned by the authenticated user.
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Fetch task by id
    task = session.get(Task, task_id)

    # Verify task exists and belongs to user
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    return task


# =============================================================================
# US4: Update an Existing Task - PATCH /api/{user_id}/tasks/{task_id}
# =============================================================================

@router.patch("/{user_id}/tasks/{task_id}", response_model=Task)
async def update_task(
    user_id: str,
    task_id: int,
    data: UpdateTaskDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> Task:
    """
    Update a task's title, description, or completion status.

    Partial updates are supported - only provided fields are updated.
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Fetch task by id
    task = session.get(Task, task_id)

    # Verify task exists and belongs to user
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    # Apply partial update
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    # Update timestamp
    task.updated_at = datetime.utcnow()

    # Persist changes
    session.add(task)
    session.commit()
    session.refresh(task)

    return task


# =============================================================================
# US4 (alt): Update an Existing Task - PUT /api/{user_id}/tasks/{task_id}
# =============================================================================

@router.put("/{user_id}/tasks/{task_id}", response_model=Task)
async def update_task_put(
    user_id: str,
    task_id: int,
    data: UpdateTaskDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> Task:
    """
    Update a task (PUT variant - same as PATCH for convenience).
    """
    # Verify user access
    verify_user_access(user_id, token_user_id)

    # Fetch task by id
    task = session.get(Task, task_id)

    # Verify task exists and belongs to user
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    # Apply partial update
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    # Update timestamp
    task.updated_at = datetime.utcnow()

    # Persist changes
    session.add(task)
    session.commit()
    session.refresh(task)

    return task


# =============================================================================
# Toggle Task Completion - PATCH /api/{user_id}/tasks/{task_id}/complete
# =============================================================================

@router.patch("/{user_id}/tasks/{task_id}/complete", response_model=Task)
async def toggle_task_complete(
    user_id: str,
    task_id: int,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> Task:
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

    return task


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
