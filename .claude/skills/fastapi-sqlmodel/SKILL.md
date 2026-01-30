# FastAPI + SQLModel Backend Development Skill

## Purpose

Guide for building FastAPI REST APIs with SQLModel ORM connected to Neon PostgreSQL for Phase II hackathon backend.

## Technology Stack

- **Python 3.11+** - Modern Python with type hints
- **FastAPI** - Async web framework with automatic OpenAPI docs
- **SQLModel** - ORM combining SQLAlchemy + Pydantic
- **Neon Serverless PostgreSQL** - Managed PostgreSQL database
- **python-jose** - JWT token verification
- **uvicorn** - ASGI server

---

## Project Structure

```
backend/
├── main.py                    # FastAPI app entry point
├── db.py                      # Database connection & session
├── models.py                  # SQLModel table definitions
├── schemas.py                 # Pydantic request/response schemas
├── routes/
│   ├── __init__.py
│   ├── tasks.py               # Task CRUD endpoints
│   ├── users.py               # User endpoints (optional)
│   └── health.py              # Health check endpoint
├── middleware/
│   ├── __init__.py
│   └── jwt_auth.py            # JWT verification dependency
├── utils/
│   ├── __init__.py
│   └── security.py            # Security helpers
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables
└── .env.example               # Example env file
```

---

## Requirements

```txt
# requirements.txt
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
sqlmodel>=0.0.14
psycopg2-binary>=2.9.9
python-jose[cryptography]>=3.3.0
python-dotenv>=1.0.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
```

---

## SQLModel Models

SQLModel combines SQLAlchemy (database) with Pydantic (validation) in a single model.

```python
# models.py
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, func, Index


class User(SQLModel, table=True):
    """User model - synced with Better Auth users table."""

    __tablename__ = "user"

    id: str = Field(primary_key=True)  # UUID from Better Auth
    email: str = Field(unique=True, index=True)
    name: str
    email_verified: bool = Field(default=False)
    image: Optional[str] = None
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now()
        )
    )

    # Relationship to tasks
    tasks: List["Task"] = Relationship(back_populates="user")


class Task(SQLModel, table=True):
    """Task model - user-owned tasks."""

    __tablename__ = "task"
    __table_args__ = (
        # CRITICAL: Index on user_id for query performance
        Index("ix_task_user_id", "user_id"),
        # Composite index for common queries
        Index("ix_task_user_id_completed", "user_id", "completed"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", nullable=False)
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    completed: bool = Field(default=False)
    priority: str = Field(default="medium")  # low, medium, high
    due_date: Optional[datetime] = None
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now()
        )
    )

    # Relationship back to user
    user: Optional[User] = Relationship(back_populates="tasks")


# Additional models can follow the same pattern
class Category(SQLModel, table=True):
    """Category for organizing tasks."""

    __tablename__ = "category"
    __table_args__ = (
        Index("ix_category_user_id", "user_id"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id", nullable=False)
    name: str = Field(min_length=1, max_length=100)
    color: str = Field(default="#3B82F6")  # Tailwind blue-500
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), server_default=func.now())
    )
```

### Why Index on user_id is CRITICAL

```python
# WITHOUT index on user_id:
# - Every query scans ALL rows in the table
# - O(n) time complexity where n = total tasks
# - 1M tasks = 1M row scans per request
# - Database CPU spikes, slow response times

# WITH index on user_id:
# - Query uses index to find user's tasks directly
# - O(log n) time complexity
# - 1M tasks = ~20 index lookups per request
# - Fast, consistent response times

__table_args__ = (
    Index("ix_task_user_id", "user_id"),  # ADD THIS!
)
```

---

## Database Connection

```python
# db.py
import os
from typing import Generator
from sqlmodel import SQLModel, Session, create_engine
from dotenv import load_dotenv

load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Handle Neon PostgreSQL URL format
# Neon uses postgresql:// but SQLAlchemy prefers postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine with connection pool settings
engine = create_engine(
    DATABASE_URL,
    echo=False,  # Set True for SQL query logging (debug only)
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=300,    # Recycle connections after 5 minutes
)


def create_tables() -> None:
    """Create all tables in the database."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    Dependency that provides a database session.

    Usage:
        @app.get("/items")
        def get_items(session: Session = Depends(get_session)):
            return session.exec(select(Item)).all()
    """
    with Session(engine) as session:
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()


# Alternative async version for async routes (requires asyncpg)
# from sqlmodel.ext.asyncio.session import AsyncSession
# from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine
#
# async_engine = create_async_engine(
#     DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
#     echo=False,
# )
#
# async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
#     async with AsyncSession(async_engine) as session:
#         yield session
```

---

## FastAPI Application Setup

```python
# main.py
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from db import create_tables
from routes import tasks, health

load_dotenv()

# Get frontend URL for CORS
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup/shutdown events.
    Replaces deprecated @app.on_event decorators.
    """
    # Startup: Create database tables
    print("Creating database tables...")
    create_tables()
    print("Database tables created successfully")

    yield  # Application runs here

    # Shutdown: Cleanup (if needed)
    print("Shutting down...")


# Create FastAPI application
app = FastAPI(
    title="Task Manager API",
    description="REST API for managing user tasks",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",  # Local development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(tasks.router, prefix="/api", tags=["Tasks"])


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": "Task Manager API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload for development
    )
```

---

## JWT Verification Middleware

```python
# middleware/jwt_auth.py
import os
from typing import Optional
from fastapi import HTTPException, Header, status
from jose import jwt, JWTError
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# MUST match Better Auth secret on frontend
BETTER_AUTH_SECRET = os.getenv("BETTER_AUTH_SECRET")

if not BETTER_AUTH_SECRET:
    raise ValueError("BETTER_AUTH_SECRET environment variable is required")

# JWT Configuration
ALGORITHM = "HS256"


class TokenPayload(BaseModel):
    """Decoded JWT token payload."""
    sub: str  # User ID
    exp: int  # Expiration timestamp
    iat: int  # Issued at timestamp


class AuthenticatedUser(BaseModel):
    """Authenticated user information extracted from JWT."""
    user_id: str


def verify_jwt_token(
    authorization: Optional[str] = Header(None, alias="Authorization")
) -> AuthenticatedUser:
    """
    FastAPI dependency to verify JWT token and extract user info.

    Usage:
        @app.get("/protected")
        def protected_route(user: AuthenticatedUser = Depends(verify_jwt_token)):
            return {"user_id": user.user_id}

    Raises:
        HTTPException 401: Missing or invalid token
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract token from "Bearer <token>" format
    parts = authorization.split()

    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format. Use: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    try:
        # Decode and verify the JWT token
        payload = jwt.decode(
            token,
            BETTER_AUTH_SECRET,
            algorithms=[ALGORITHM],
        )

        # Extract user ID from 'sub' claim
        user_id: str = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing user ID (sub claim)",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return AuthenticatedUser(user_id=user_id)

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_user_access(user_id_from_url: str, authenticated_user: AuthenticatedUser) -> None:
    """
    Verify that the authenticated user has access to the requested resource.

    CRITICAL: This prevents users from accessing other users' data.

    Usage:
        @app.get("/api/{user_id}/tasks")
        def get_tasks(
            user_id: str,
            user: AuthenticatedUser = Depends(verify_jwt_token)
        ):
            verify_user_access(user_id, user)
            # ... fetch tasks

    Raises:
        HTTPException 403: User ID mismatch
    """
    if user_id_from_url != authenticated_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You can only access your own resources",
        )


# Combined dependency for routes that need both auth and user verification
def get_verified_user(
    user_id: str,
    user: AuthenticatedUser = Depends(verify_jwt_token)
) -> AuthenticatedUser:
    """
    Combined dependency: verifies JWT AND checks user_id matches.

    Usage:
        @app.get("/api/{user_id}/tasks")
        def get_tasks(
            user_id: str,
            verified_user: AuthenticatedUser = Depends(get_verified_user)
        ):
            # verified_user.user_id is guaranteed to match user_id
            # ... fetch tasks
    """
    verify_user_access(user_id, user)
    return user
```

---

## Request/Response Schemas

```python
# schemas.py
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


# ============================================================
# Task Schemas
# ============================================================

class TaskCreate(BaseModel):
    """Schema for creating a new task."""

    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    priority: str = Field(default="medium", pattern="^(low|medium|high)$")
    due_date: Optional[datetime] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Complete project documentation",
                "description": "Write API docs and README",
                "priority": "high",
                "due_date": "2024-12-31T23:59:59Z"
            }
        }
    )


class TaskUpdate(BaseModel):
    """Schema for updating an existing task (all fields optional)."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = Field(default=None, max_length=2000)
    completed: Optional[bool] = None
    priority: Optional[str] = Field(default=None, pattern="^(low|medium|high)$")
    due_date: Optional[datetime] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Updated title",
                "completed": True
            }
        }
    )


class TaskResponse(BaseModel):
    """Schema for task response (all fields included)."""

    id: int
    user_id: str
    title: str
    description: Optional[str]
    completed: bool
    priority: str
    due_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    """Schema for list of tasks with metadata."""

    items: List[TaskResponse]
    total: int

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "items": [
                    {
                        "id": 1,
                        "user_id": "user-123",
                        "title": "Task 1",
                        "description": None,
                        "completed": False,
                        "priority": "medium",
                        "due_date": None,
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z"
                    }
                ],
                "total": 1
            }
        }
    )


# ============================================================
# Error Schemas
# ============================================================

class ErrorResponse(BaseModel):
    """Standard error response schema."""

    detail: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": "Task not found"
            }
        }
    )


class ValidationErrorResponse(BaseModel):
    """Validation error response schema."""

    detail: List[dict]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": [
                    {
                        "loc": ["body", "title"],
                        "msg": "field required",
                        "type": "value_error.missing"
                    }
                ]
            }
        }
    )


# ============================================================
# Message Schemas
# ============================================================

class MessageResponse(BaseModel):
    """Simple message response."""

    message: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "Task deleted successfully"
            }
        }
    )
```

---

## API Routes (CRUD)

```python
# routes/tasks.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select

from db import get_session
from models import Task
from schemas import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskListResponse,
    MessageResponse,
)
from middleware.jwt_auth import AuthenticatedUser, verify_jwt_token, verify_user_access

router = APIRouter()


# ============================================================
# GET /api/{user_id}/tasks - List all tasks for user
# ============================================================
@router.get(
    "/{user_id}/tasks",
    response_model=TaskListResponse,
    summary="List user tasks",
    description="Get all tasks for the authenticated user with optional filtering.",
)
async def get_tasks(
    user_id: str,
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
    completed: Optional[bool] = Query(None, description="Filter by completed status"),
    priority: Optional[str] = Query(None, pattern="^(low|medium|high)$"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
) -> TaskListResponse:
    """
    List all tasks for the authenticated user.

    CRITICAL: Always filter by user_id to ensure data isolation.
    """
    # Verify user has access to this user_id
    verify_user_access(user_id, user)

    # Build query - ALWAYS filter by user_id
    query = select(Task).where(Task.user_id == user_id)

    # Apply optional filters
    if completed is not None:
        query = query.where(Task.completed == completed)

    if priority:
        query = query.where(Task.priority == priority)

    # Order by created_at descending (newest first)
    query = query.order_by(Task.created_at.desc())

    # Get total count before pagination
    count_query = select(Task).where(Task.user_id == user_id)
    if completed is not None:
        count_query = count_query.where(Task.completed == completed)
    if priority:
        count_query = count_query.where(Task.priority == priority)

    total = len(session.exec(count_query).all())

    # Apply pagination
    query = query.offset(offset).limit(limit)

    tasks = session.exec(query).all()

    return TaskListResponse(
        items=[TaskResponse.model_validate(task) for task in tasks],
        total=total,
    )


# ============================================================
# POST /api/{user_id}/tasks - Create new task
# ============================================================
@router.post(
    "/{user_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create task",
    description="Create a new task for the authenticated user.",
)
async def create_task(
    user_id: str,
    task_data: TaskCreate,
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
) -> TaskResponse:
    """
    Create a new task for the authenticated user.
    """
    # Verify user has access to this user_id
    verify_user_access(user_id, user)

    # Create task with user_id from authenticated user
    task = Task(
        user_id=user_id,
        title=task_data.title,
        description=task_data.description,
        priority=task_data.priority,
        due_date=task_data.due_date,
    )

    session.add(task)
    session.commit()
    session.refresh(task)

    return TaskResponse.model_validate(task)


# ============================================================
# GET /api/{user_id}/tasks/{task_id} - Get single task
# ============================================================
@router.get(
    "/{user_id}/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Get task",
    description="Get a single task by ID.",
    responses={
        404: {"description": "Task not found"},
    },
)
async def get_task(
    user_id: str,
    task_id: int,
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
) -> TaskResponse:
    """
    Get a single task by ID.

    CRITICAL: Filter by BOTH task_id AND user_id.
    """
    # Verify user has access to this user_id
    verify_user_access(user_id, user)

    # Query with BOTH task_id AND user_id
    task = session.exec(
        select(Task)
        .where(Task.id == task_id)
        .where(Task.user_id == user_id)  # CRITICAL: Always include user_id
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return TaskResponse.model_validate(task)


# ============================================================
# PUT /api/{user_id}/tasks/{task_id} - Full update
# ============================================================
@router.put(
    "/{user_id}/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Update task (full)",
    description="Fully update a task. All fields in request body will be applied.",
    responses={
        404: {"description": "Task not found"},
    },
)
async def update_task(
    user_id: str,
    task_id: int,
    task_data: TaskUpdate,
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
) -> TaskResponse:
    """
    Fully update a task.
    """
    # Verify user has access
    verify_user_access(user_id, user)

    # Get existing task - filter by user_id
    task = session.exec(
        select(Task)
        .where(Task.id == task_id)
        .where(Task.user_id == user_id)
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Update fields that are provided
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    session.add(task)
    session.commit()
    session.refresh(task)

    return TaskResponse.model_validate(task)


# ============================================================
# PATCH /api/{user_id}/tasks/{task_id} - Partial update
# ============================================================
@router.patch(
    "/{user_id}/tasks/{task_id}",
    response_model=TaskResponse,
    summary="Update task (partial)",
    description="Partially update a task. Only provided fields will be updated.",
    responses={
        404: {"description": "Task not found"},
    },
)
async def patch_task(
    user_id: str,
    task_id: int,
    task_data: TaskUpdate,
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
) -> TaskResponse:
    """
    Partially update a task.
    """
    # Same implementation as PUT for this use case
    return await update_task(user_id, task_id, task_data, session, user)


# ============================================================
# DELETE /api/{user_id}/tasks/{task_id} - Delete task
# ============================================================
@router.delete(
    "/{user_id}/tasks/{task_id}",
    response_model=MessageResponse,
    summary="Delete task",
    description="Delete a task by ID.",
    responses={
        404: {"description": "Task not found"},
    },
)
async def delete_task(
    user_id: str,
    task_id: int,
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
) -> MessageResponse:
    """
    Delete a task.
    """
    # Verify user has access
    verify_user_access(user_id, user)

    # Get task - filter by user_id
    task = session.exec(
        select(Task)
        .where(Task.id == task_id)
        .where(Task.user_id == user_id)
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    session.delete(task)
    session.commit()

    return MessageResponse(message="Task deleted successfully")


# ============================================================
# PATCH /api/{user_id}/tasks/{task_id}/complete - Toggle complete
# ============================================================
@router.patch(
    "/{user_id}/tasks/{task_id}/complete",
    response_model=TaskResponse,
    summary="Toggle task completion",
    description="Toggle the completed status of a task.",
    responses={
        404: {"description": "Task not found"},
    },
)
async def toggle_task_complete(
    user_id: str,
    task_id: int,
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
) -> TaskResponse:
    """
    Toggle the completed status of a task.
    """
    # Verify user has access
    verify_user_access(user_id, user)

    # Get task - filter by user_id
    task = session.exec(
        select(Task)
        .where(Task.id == task_id)
        .where(Task.user_id == user_id)
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Toggle completed status
    task.completed = not task.completed

    session.add(task)
    session.commit()
    session.refresh(task)

    return TaskResponse.model_validate(task)
```

### Health Check Route

```python
# routes/health.py
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    message: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Health check endpoint for monitoring."""
    return HealthResponse(
        status="healthy",
        message="API is running",
    )
```

### Routes Init

```python
# routes/__init__.py
from . import tasks
from . import health

__all__ = ["tasks", "health"]
```

---

## HTTP Status Codes

| Code | Constant | Usage |
|------|----------|-------|
| **200** | `HTTP_200_OK` | Successful GET, PUT, PATCH, DELETE |
| **201** | `HTTP_201_CREATED` | Successful POST (resource created) |
| **204** | `HTTP_204_NO_CONTENT` | Successful DELETE (no response body) |
| **400** | `HTTP_400_BAD_REQUEST` | Invalid request data |
| **401** | `HTTP_401_UNAUTHORIZED` | Missing or invalid JWT token |
| **403** | `HTTP_403_FORBIDDEN` | User lacks permission (user_id mismatch) |
| **404** | `HTTP_404_NOT_FOUND` | Resource not found |
| **422** | `HTTP_422_UNPROCESSABLE_ENTITY` | Validation error (automatic from Pydantic) |
| **500** | `HTTP_500_INTERNAL_SERVER_ERROR` | Server error |

### Using HTTPException

```python
from fastapi import HTTPException, status

# 401 Unauthorized
raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)

# 403 Forbidden
raise HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail="You do not have permission to access this resource",
)

# 404 Not Found
raise HTTPException(
    status_code=status.HTTP_404_NOT_FOUND,
    detail="Task not found",
)

# 400 Bad Request
raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Invalid priority value. Must be: low, medium, or high",
)
```

---

## Environment Variables

```bash
# .env

# Database - Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/database?sslmode=require

# JWT Secret - MUST match Better Auth secret on frontend
BETTER_AUTH_SECRET=your-secret-key-minimum-32-characters-long

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Optional: Environment mode
ENVIRONMENT=development
```

### Example .env file

```bash
# .env.example

# Database - Get from Neon dashboard
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# JWT Secret - Generate with: openssl rand -hex 32
BETTER_AUTH_SECRET=

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Environment
ENVIRONMENT=development
```

---

## Best Practices

### 1. ALWAYS Filter by user_id

```python
# CORRECT - Filter by user_id
tasks = session.exec(
    select(Task)
    .where(Task.user_id == user_id)
    .where(Task.completed == False)
).all()

# WRONG - Missing user_id filter (SECURITY VULNERABILITY!)
tasks = session.exec(
    select(Task)
    .where(Task.completed == False)
).all()
```

### 2. Use async def for All Routes

```python
# CORRECT - async def
@router.get("/tasks")
async def get_tasks():
    # ...

# AVOID - sync def (blocks event loop)
@router.get("/tasks")
def get_tasks():
    # ...
```

### 3. Type Everything with Pydantic

```python
# CORRECT - Full type annotations
@router.post("/tasks", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    session: Session = Depends(get_session),
) -> TaskResponse:
    # ...

# AVOID - Missing types
@router.post("/tasks")
async def create_task(task_data, session):
    # ...
```

### 4. Index Foreign Keys

```python
# CORRECT - Index on foreign key
class Task(SQLModel, table=True):
    __table_args__ = (
        Index("ix_task_user_id", "user_id"),
    )
    user_id: str = Field(foreign_key="user.id")

# WRONG - No index (slow queries at scale)
class Task(SQLModel, table=True):
    user_id: str = Field(foreign_key="user.id")
```

### 5. Handle Errors with HTTPException

```python
# CORRECT - Proper error handling
@router.get("/{user_id}/tasks/{task_id}")
async def get_task(user_id: str, task_id: int):
    task = session.exec(
        select(Task)
        .where(Task.id == task_id)
        .where(Task.user_id == user_id)
    ).first()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    return task

# WRONG - Returns None or crashes
@router.get("/{user_id}/tasks/{task_id}")
async def get_task(user_id: str, task_id: int):
    return session.get(Task, task_id)  # No user_id check!
```

### 6. Use Depends for Dependency Injection

```python
# CORRECT - Dependencies injected
@router.get("/tasks")
async def get_tasks(
    session: Session = Depends(get_session),
    user: AuthenticatedUser = Depends(verify_jwt_token),
):
    # session and user are automatically provided

# WRONG - Manual instantiation
@router.get("/tasks")
async def get_tasks():
    session = Session(engine)  # Manual, error-prone
    # ...
```

---

## Security Rules

### 1. JWT Verification on ALL Protected Routes

```python
# Every protected route MUST include JWT verification
@router.get("/{user_id}/tasks")
async def get_tasks(
    user_id: str,
    user: AuthenticatedUser = Depends(verify_jwt_token),  # REQUIRED
):
    verify_user_access(user_id, user)
    # ...
```

### 2. Validate user_id Matches Token

```python
def verify_user_access(user_id_from_url: str, authenticated_user: AuthenticatedUser):
    """CRITICAL: Prevent users from accessing other users' data."""
    if user_id_from_url != authenticated_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
```

### 3. Filter ALL Queries by user_id

```python
# EVERY database query must include user_id in WHERE clause
task = session.exec(
    select(Task)
    .where(Task.id == task_id)
    .where(Task.user_id == user_id)  # ALWAYS INCLUDE THIS
).first()
```

### 4. Never Expose Other Users' Data

```python
# SECURE - Returns 404 if task exists but belongs to different user
task = session.exec(
    select(Task)
    .where(Task.id == task_id)
    .where(Task.user_id == user_id)
).first()

if not task:
    raise HTTPException(status_code=404, detail="Task not found")

# INSECURE - Reveals task exists but belongs to someone else
task = session.get(Task, task_id)
if task.user_id != user_id:
    raise HTTPException(status_code=403, detail="Not your task")  # BAD!
```

---

## Running the Application

### Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run with auto-reload
uvicorn main:app --reload --port 8000

# Or using Python directly
python main.py
```

### Production

```bash
# Run with multiple workers
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### API Documentation

Once running, access:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## Quick Reference

### Common Imports

```python
# FastAPI
from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body
from fastapi.responses import JSONResponse

# SQLModel
from sqlmodel import SQLModel, Session, Field, Relationship, select
from sqlalchemy import Column, DateTime, func, Index

# Pydantic
from pydantic import BaseModel, Field, ConfigDict

# Standard library
from typing import Optional, List, Generator
from datetime import datetime

# Local
from db import get_session
from models import Task, User
from schemas import TaskCreate, TaskUpdate, TaskResponse
from middleware.jwt_auth import verify_jwt_token, AuthenticatedUser
```

### SQLModel Query Patterns

```python
# Get all (with filter)
tasks = session.exec(select(Task).where(Task.user_id == user_id)).all()

# Get one by ID
task = session.get(Task, task_id)

# Get one with filter
task = session.exec(
    select(Task)
    .where(Task.id == task_id)
    .where(Task.user_id == user_id)
).first()

# Create
task = Task(title="New Task", user_id=user_id)
session.add(task)
session.commit()
session.refresh(task)

# Update
task.title = "Updated Title"
session.add(task)
session.commit()

# Delete
session.delete(task)
session.commit()

# Count
count = len(session.exec(select(Task).where(Task.user_id == user_id)).all())

# Order by
tasks = session.exec(
    select(Task)
    .where(Task.user_id == user_id)
    .order_by(Task.created_at.desc())
).all()

# Pagination
tasks = session.exec(
    select(Task)
    .where(Task.user_id == user_id)
    .offset(offset)
    .limit(limit)
).all()
```
