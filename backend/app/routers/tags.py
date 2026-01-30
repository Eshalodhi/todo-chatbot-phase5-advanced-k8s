"""Tag management API endpoints for Phase V."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import verify_jwt_token, verify_user_access
from app.database import get_session
from app.models import Tag, TaskTag, Task
from app.schemas import CreateTagDTO, TagDTO, TagListDTO, TaskTagDTO

router = APIRouter(prefix="/api", tags=["Tags"])


# =============================================================================
# List Tags - GET /api/{user_id}/tags
# =============================================================================

@router.get("/{user_id}/tags", response_model=TagListDTO)
async def list_tags(
    user_id: str,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> TagListDTO:
    """List all tags for the authenticated user."""
    verify_user_access(user_id, token_user_id)

    tags = list(session.exec(
        select(Tag).where(Tag.user_id == user_id).order_by(Tag.name)
    ).all())

    return TagListDTO(
        tags=[
            TagDTO(
                id=tag.id,
                name=tag.name,
                color=tag.color,
                created_at=tag.created_at.isoformat()
            )
            for tag in tags
        ],
        count=len(tags)
    )


# =============================================================================
# Create Tag - POST /api/{user_id}/tags
# =============================================================================

@router.post("/{user_id}/tags", response_model=TagDTO, status_code=201)
async def create_tag(
    user_id: str,
    data: CreateTagDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> TagDTO:
    """Create a new tag for the authenticated user."""
    verify_user_access(user_id, token_user_id)

    # Check for duplicate tag name for this user
    existing = session.exec(
        select(Tag)
        .where(Tag.user_id == user_id)
        .where(Tag.name == data.name)
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail=f"Tag '{data.name}' already exists")

    tag = Tag(
        user_id=user_id,
        name=data.name,
        color=data.color
    )
    session.add(tag)
    session.commit()
    session.refresh(tag)

    return TagDTO(
        id=tag.id,
        name=tag.name,
        color=tag.color,
        created_at=tag.created_at.isoformat()
    )


# =============================================================================
# Delete Tag - DELETE /api/{user_id}/tags/{tag_id}
# =============================================================================

@router.delete("/{user_id}/tags/{tag_id}", status_code=204)
async def delete_tag(
    user_id: str,
    tag_id: int,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> None:
    """Delete a tag and all its task associations."""
    verify_user_access(user_id, token_user_id)

    tag = session.get(Tag, tag_id)
    if not tag or tag.user_id != user_id:
        raise HTTPException(status_code=404, detail="Tag not found")

    # Delete task-tag associations
    associations = list(session.exec(
        select(TaskTag).where(TaskTag.tag_id == tag_id)
    ).all())
    for assoc in associations:
        session.delete(assoc)

    session.delete(tag)
    session.commit()


# =============================================================================
# Add Tag to Task - POST /api/{user_id}/tasks/{task_id}/tags
# =============================================================================

@router.post("/{user_id}/tasks/{task_id}/tags", status_code=201)
async def add_tag_to_task(
    user_id: str,
    task_id: int,
    data: TaskTagDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> dict:
    """Add a tag to a task."""
    verify_user_access(user_id, token_user_id)

    # Verify task belongs to user
    task = session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    # Verify tag belongs to user
    tag = session.get(Tag, data.tag_id)
    if not tag or tag.user_id != user_id:
        raise HTTPException(status_code=404, detail="Tag not found")

    # Check if already assigned
    existing = session.exec(
        select(TaskTag)
        .where(TaskTag.task_id == task_id)
        .where(TaskTag.tag_id == data.tag_id)
    ).first()

    if existing:
        raise HTTPException(status_code=409, detail="Tag already assigned to this task")

    task_tag = TaskTag(task_id=task_id, tag_id=data.tag_id)
    session.add(task_tag)
    session.commit()

    return {"message": f"Tag '{tag.name}' added to task '{task.title}'"}


# =============================================================================
# Remove Tag from Task - DELETE /api/{user_id}/tasks/{task_id}/tags/{tag_id}
# =============================================================================

@router.delete("/{user_id}/tasks/{task_id}/tags/{tag_id}", status_code=204)
async def remove_tag_from_task(
    user_id: str,
    task_id: int,
    tag_id: int,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session),
) -> None:
    """Remove a tag from a task."""
    verify_user_access(user_id, token_user_id)

    # Verify task belongs to user
    task = session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(status_code=404, detail="Task not found")

    # Find and delete the association
    task_tag = session.exec(
        select(TaskTag)
        .where(TaskTag.task_id == task_id)
        .where(TaskTag.tag_id == tag_id)
    ).first()

    if not task_tag:
        raise HTTPException(status_code=404, detail="Tag not assigned to this task")

    session.delete(task_tag)
    session.commit()
