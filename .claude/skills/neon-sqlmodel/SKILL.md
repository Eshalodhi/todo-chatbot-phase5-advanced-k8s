# Neon PostgreSQL + SQLModel Skill

## Purpose

Guide for connecting to Neon Serverless PostgreSQL using SQLModel ORM for Phase II hackathon multi-user database.

---

## Technology Stack

- **Neon Serverless PostgreSQL** - Managed cloud PostgreSQL with autoscaling
- **SQLModel** - ORM combining SQLAlchemy + Pydantic (Python)
- **psycopg2-binary** - PostgreSQL adapter for Python

### Requirements

```txt
# requirements.txt
sqlmodel>=0.0.14
psycopg2-binary>=2.9.9
python-dotenv>=1.0.0
```

---

## Neon Setup

### Step 1: Create Neon Account

1. Go to https://neon.tech
2. Sign up with GitHub, Google, or email
3. Verify your account

### Step 2: Create Project

1. Click "Create Project"
2. Enter project name (e.g., "hackathon-phase2")
3. Select region closest to users (e.g., "US East (N. Virginia)")
4. Click "Create Project"

### Step 3: Get Connection String

After project creation, Neon displays the connection string:

```
postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Connection String Components:**

| Part | Description | Example |
|------|-------------|---------|
| `postgresql://` | Protocol | Required prefix |
| `username` | Database user | `neondb_owner` |
| `password` | User password | Auto-generated |
| `@ep-cool-name-123456` | Endpoint ID | Unique per project |
| `.us-east-2.aws.neon.tech` | Region | Based on selection |
| `/neondb` | Database name | Default database |
| `?sslmode=require` | SSL mode | Required for security |

### Step 4: Save to Environment

```bash
# backend/.env
DATABASE_URL=postgresql://username:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

## Database Connection

```python
# db.py
import os
from typing import Generator
from sqlmodel import SQLModel, Session, create_engine
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is required. "
        "Get it from your Neon dashboard."
    )

# Handle URL format differences
# Neon sometimes uses 'postgres://' but SQLAlchemy prefers 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create database engine
engine = create_engine(
    DATABASE_URL,
    echo=False,           # Set True to log SQL queries (debug only)
    pool_size=5,          # Number of persistent connections
    max_overflow=10,      # Additional connections when pool exhausted
    pool_pre_ping=True,   # Verify connections before use (handles Neon cold starts)
    pool_recycle=300,     # Recycle connections every 5 minutes
    connect_args={
        "connect_timeout": 10,  # Connection timeout in seconds
    },
)


def create_tables() -> None:
    """
    Create all tables defined in SQLModel models.

    Call this on application startup to ensure tables exist.
    Safe to call multiple times - only creates tables that don't exist.
    """
    SQLModel.metadata.create_all(engine)


def drop_tables() -> None:
    """
    Drop all tables. USE WITH CAUTION - deletes all data!

    Only use for testing or development reset.
    """
    SQLModel.metadata.drop_all(engine)


def get_session() -> Generator[Session, None, None]:
    """
    FastAPI dependency that provides a database session.

    Usage:
        @app.get("/items")
        def get_items(session: Session = Depends(get_session)):
            return session.exec(select(Item)).all()

    The session is automatically:
    - Created when the request starts
    - Committed if no errors
    - Rolled back if exceptions occur
    - Closed when the request ends
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


# Alternative: Simple session factory for scripts
def create_session() -> Session:
    """
    Create a new session. Remember to close it!

    Usage:
        session = create_session()
        try:
            # do work
            session.commit()
        finally:
            session.close()
    """
    return Session(engine)
```

---

## SQLModel Model Definitions

```python
# models.py
from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, DateTime, String, Boolean, Integer, Text, func, Index


# ============================================================
# User Model
# ============================================================

class User(SQLModel, table=True):
    """
    User model - stores user account information.

    For Better Auth integration, this table is managed by Better Auth.
    SQLModel is used for relationships and type safety.
    """

    __tablename__ = "user"  # Better Auth uses singular 'user'

    # Primary key - UUID string from Better Auth
    id: str = Field(
        primary_key=True,
        sa_column=Column(String(36), primary_key=True),
    )

    # Email - unique, indexed for login queries
    email: str = Field(
        sa_column=Column(String(255), unique=True, nullable=False, index=True),
    )

    # Display name
    name: str = Field(
        sa_column=Column(String(255), nullable=False),
    )

    # Email verification status
    email_verified: bool = Field(
        default=False,
        sa_column=Column(Boolean, default=False),
    )

    # Profile image URL (optional)
    image: Optional[str] = Field(
        default=None,
        sa_column=Column(String(500), nullable=True),
    )

    # Timestamps
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        ),
    )

    # Relationship to tasks (one-to-many)
    tasks: List["Task"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",  # Delete tasks when user deleted
            "lazy": "selectin",               # Eager load for performance
        },
    )


# ============================================================
# Task Model
# ============================================================

class Task(SQLModel, table=True):
    """
    Task model - stores user tasks.

    CRITICAL: user_id is indexed because EVERY query filters by it.
    """

    __tablename__ = "task"

    # Table-level indexes
    __table_args__ = (
        # CRITICAL: Index on user_id - filtered on EVERY query
        Index("ix_task_user_id", "user_id"),
        # Index on completed - filtered when showing active/done tasks
        Index("ix_task_completed", "completed"),
        # Composite index for common query: user's incomplete tasks
        Index("ix_task_user_completed", "user_id", "completed"),
        # Composite index for sorting: user's tasks by date
        Index("ix_task_user_created", "user_id", "created_at"),
    )

    # Primary key - auto-incrementing integer
    id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, primary_key=True, autoincrement=True),
    )

    # Foreign key to user - INDEXED
    user_id: str = Field(
        sa_column=Column(
            String(36),
            nullable=False,
            index=True,  # Critical for query performance
        ),
        foreign_key="user.id",
    )

    # Task title - required, max 200 chars
    title: str = Field(
        sa_column=Column(String(200), nullable=False),
        min_length=1,
        max_length=200,
    )

    # Task description - optional, longer text
    description: Optional[str] = Field(
        default=None,
        sa_column=Column(Text, nullable=True),
    )

    # Completion status - indexed for filtering
    completed: bool = Field(
        default=False,
        sa_column=Column(Boolean, default=False, nullable=False, index=True),
    )

    # Priority level
    priority: str = Field(
        default="medium",
        sa_column=Column(String(20), default="medium", nullable=False),
    )

    # Due date (optional)
    due_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    # Timestamps
    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            nullable=False,
        ),
    )
    updated_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
            onupdate=func.now(),
            nullable=False,
        ),
    )

    # Relationship back to user (many-to-one)
    user: Optional[User] = Relationship(back_populates="tasks")


# ============================================================
# Category Model (Optional - for organizing tasks)
# ============================================================

class Category(SQLModel, table=True):
    """Category for organizing tasks."""

    __tablename__ = "category"

    __table_args__ = (
        Index("ix_category_user_id", "user_id"),
    )

    id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, primary_key=True, autoincrement=True),
    )

    user_id: str = Field(
        sa_column=Column(String(36), nullable=False, index=True),
        foreign_key="user.id",
    )

    name: str = Field(
        sa_column=Column(String(100), nullable=False),
        min_length=1,
        max_length=100,
    )

    color: str = Field(
        default="#3B82F6",
        sa_column=Column(String(7), default="#3B82F6"),
    )

    created_at: datetime = Field(
        sa_column=Column(
            DateTime(timezone=True),
            server_default=func.now(),
        ),
    )
```

---

## Why Indexes Are Critical

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      INDEX PERFORMANCE IMPACT                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WITHOUT INDEX on user_id:                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Query: SELECT * FROM tasks WHERE user_id = 'abc123'            │    │
│  │                                                                  │    │
│  │  Database must: Scan ALL rows → Check each user_id → Return     │    │
│  │                                                                  │    │
│  │  10,000 tasks → 10,000 row reads                                │    │
│  │  100,000 tasks → 100,000 row reads                              │    │
│  │  1,000,000 tasks → 1,000,000 row reads                          │    │
│  │                                                                  │    │
│  │  O(n) - Linear time, gets slower as data grows                  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  WITH INDEX on user_id:                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Query: SELECT * FROM tasks WHERE user_id = 'abc123'            │    │
│  │                                                                  │    │
│  │  Database: Use index → Jump directly to user's rows             │    │
│  │                                                                  │    │
│  │  10,000 tasks → ~4 index lookups + user's rows                  │    │
│  │  100,000 tasks → ~5 index lookups + user's rows                 │    │
│  │  1,000,000 tasks → ~6 index lookups + user's rows               │    │
│  │                                                                  │    │
│  │  O(log n) - Logarithmic time, stays fast as data grows          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  COLUMNS TO INDEX:                                                       │
│  ├── user_id      - Filtered on EVERY query (multi-tenant)             │
│  ├── completed    - Filtered when showing active/completed tasks       │
│  ├── email        - Used in login queries                               │
│  └── created_at   - Used in ORDER BY for sorting                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Relationships and Foreign Keys

### One-to-Many: User → Tasks

```python
# models.py

class User(SQLModel, table=True):
    __tablename__ = "user"

    id: str = Field(primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str

    # One user has MANY tasks
    tasks: List["Task"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",  # ON DELETE CASCADE
            "lazy": "selectin",               # Eager loading
        },
    )


class Task(SQLModel, table=True):
    __tablename__ = "task"

    id: Optional[int] = Field(default=None, primary_key=True)

    # Foreign key - references user.id
    user_id: str = Field(
        foreign_key="user.id",  # Table.column format
        index=True,             # CRITICAL: Index for performance
    )

    title: str

    # MANY tasks belong to ONE user
    user: Optional[User] = Relationship(back_populates="tasks")
```

### ON DELETE CASCADE Behavior

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ON DELETE CASCADE                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  When user is deleted → All their tasks are automatically deleted       │
│                                                                          │
│  BEFORE DELETE:                                                          │
│  ┌──────────────┐      ┌─────────────────────────────────────┐          │
│  │    users     │      │              tasks                   │          │
│  ├──────────────┤      ├─────────────────────────────────────┤          │
│  │ id: user_a   │──────│ id: 1, user_id: user_a, title: ... │          │
│  │ id: user_b   │      │ id: 2, user_id: user_a, title: ... │          │
│  └──────────────┘      │ id: 3, user_id: user_b, title: ... │          │
│                        └─────────────────────────────────────┘          │
│                                                                          │
│  DELETE FROM users WHERE id = 'user_a'                                   │
│                                                                          │
│  AFTER DELETE (with CASCADE):                                            │
│  ┌──────────────┐      ┌─────────────────────────────────────┐          │
│  │    users     │      │              tasks                   │          │
│  ├──────────────┤      ├─────────────────────────────────────┤          │
│  │ id: user_b   │──────│ id: 3, user_id: user_b, title: ... │          │
│  └──────────────┘      └─────────────────────────────────────┘          │
│                                                                          │
│  Tasks 1 and 2 were automatically deleted with user_a                   │
│                                                                          │
│  Configured via:                                                         │
│  sa_relationship_kwargs={"cascade": "all, delete-orphan"}               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Accessing Related Objects

```python
# Get user with their tasks (eager loaded)
user = session.get(User, "user_123")
print(f"User {user.name} has {len(user.tasks)} tasks")

for task in user.tasks:
    print(f"  - {task.title}")

# Get task and access its user
task = session.get(Task, 1)
print(f"Task '{task.title}' belongs to {task.user.name}")
```

---

## CRUD Operations

### Create

```python
from sqlmodel import Session
from models import Task, User
from db import get_session

# Create a new task
def create_task(session: Session, user_id: str, title: str, description: str = None) -> Task:
    """Create a new task for a user."""

    task = Task(
        user_id=user_id,
        title=title,
        description=description,
        completed=False,
        priority="medium",
    )

    session.add(task)
    session.commit()
    session.refresh(task)  # Reload to get auto-generated fields (id, created_at)

    return task


# Usage in FastAPI route
@router.post("/{user_id}/tasks")
async def create_task_endpoint(
    user_id: str,
    task_data: TaskCreate,
    session: Session = Depends(get_session),
):
    task = Task(
        user_id=user_id,
        title=task_data.title,
        description=task_data.description,
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    return task
```

### Read

```python
from sqlmodel import select

# Get all tasks for a user (CRITICAL: Filter by user_id)
def get_user_tasks(session: Session, user_id: str) -> list[Task]:
    """Get all tasks for a specific user."""

    statement = select(Task).where(Task.user_id == user_id)
    tasks = session.exec(statement).all()

    return list(tasks)


# Get a single task (CRITICAL: Filter by BOTH id AND user_id)
def get_task(session: Session, task_id: int, user_id: str) -> Task | None:
    """Get a single task, verifying ownership."""

    statement = select(Task).where(
        Task.id == task_id,
        Task.user_id == user_id,  # CRITICAL: Verify ownership
    )
    task = session.exec(statement).first()

    return task


# Get task by ID only (internal use only, no user verification)
def get_task_by_id(session: Session, task_id: int) -> Task | None:
    """Get task by ID. Only use for internal operations!"""
    return session.get(Task, task_id)
```

### Update

```python
from datetime import datetime

def update_task(
    session: Session,
    task_id: int,
    user_id: str,
    title: str = None,
    description: str = None,
    completed: bool = None,
) -> Task | None:
    """Update a task, verifying ownership."""

    # Get task with ownership check
    task = get_task(session, task_id, user_id)

    if not task:
        return None

    # Update only provided fields
    if title is not None:
        task.title = title

    if description is not None:
        task.description = description

    if completed is not None:
        task.completed = completed

    # updated_at is handled automatically by onupdate=func.now()
    # But if you need manual control:
    # task.updated_at = datetime.now()

    session.add(task)
    session.commit()
    session.refresh(task)

    return task


# Toggle completion status
def toggle_task_complete(session: Session, task_id: int, user_id: str) -> Task | None:
    """Toggle the completed status of a task."""

    task = get_task(session, task_id, user_id)

    if not task:
        return None

    task.completed = not task.completed

    session.add(task)
    session.commit()
    session.refresh(task)

    return task
```

### Delete

```python
def delete_task(session: Session, task_id: int, user_id: str) -> bool:
    """Delete a task, verifying ownership."""

    task = get_task(session, task_id, user_id)

    if not task:
        return False

    session.delete(task)
    session.commit()

    return True


# Delete all tasks for a user
def delete_all_user_tasks(session: Session, user_id: str) -> int:
    """Delete all tasks for a user. Returns count of deleted tasks."""

    statement = select(Task).where(Task.user_id == user_id)
    tasks = session.exec(statement).all()

    count = len(tasks)

    for task in tasks:
        session.delete(task)

    session.commit()

    return count
```

---

## Query Patterns

### Filter by user_id (CRITICAL - Always Required)

```python
from sqlmodel import select

# CORRECT - Always filter by user_id
statement = select(Task).where(Task.user_id == user_id)
tasks = session.exec(statement).all()

# WRONG - Missing user_id filter (SECURITY VULNERABILITY!)
statement = select(Task)  # Returns ALL users' tasks!
tasks = session.exec(statement).all()
```

### Filter by Multiple Conditions

```python
# Get incomplete tasks for a user
statement = select(Task).where(
    Task.user_id == user_id,
    Task.completed == False,
)
tasks = session.exec(statement).all()

# Get high priority incomplete tasks
statement = select(Task).where(
    Task.user_id == user_id,
    Task.completed == False,
    Task.priority == "high",
)
tasks = session.exec(statement).all()

# Using and_() for complex conditions
from sqlalchemy import and_, or_

statement = select(Task).where(
    and_(
        Task.user_id == user_id,
        or_(
            Task.priority == "high",
            Task.due_date < datetime.now(),
        ),
    )
)
```

### Order Results

```python
# Order by created_at descending (newest first)
statement = select(Task).where(
    Task.user_id == user_id
).order_by(Task.created_at.desc())

# Order by multiple columns
statement = select(Task).where(
    Task.user_id == user_id
).order_by(
    Task.completed.asc(),    # Incomplete first
    Task.priority.desc(),    # High priority first
    Task.created_at.desc(),  # Newest first
)
```

### Pagination

```python
def get_tasks_paginated(
    session: Session,
    user_id: str,
    page: int = 1,
    per_page: int = 20,
) -> tuple[list[Task], int]:
    """Get paginated tasks with total count."""

    # Calculate offset
    offset = (page - 1) * per_page

    # Get total count
    count_statement = select(Task).where(Task.user_id == user_id)
    total = len(session.exec(count_statement).all())

    # Get paginated results
    statement = select(Task).where(
        Task.user_id == user_id
    ).order_by(
        Task.created_at.desc()
    ).offset(offset).limit(per_page)

    tasks = session.exec(statement).all()

    return list(tasks), total


# Usage
tasks, total = get_tasks_paginated(session, user_id, page=2, per_page=10)
print(f"Showing {len(tasks)} of {total} tasks")
```

### Count Results

```python
# Count user's tasks
statement = select(Task).where(Task.user_id == user_id)
count = len(session.exec(statement).all())

# Count incomplete tasks
statement = select(Task).where(
    Task.user_id == user_id,
    Task.completed == False,
)
incomplete_count = len(session.exec(statement).all())

# Using func.count for efficiency (single value, no row loading)
from sqlalchemy import func

statement = select(func.count(Task.id)).where(Task.user_id == user_id)
count = session.exec(statement).one()
```

### Check Existence

```python
# Check if task exists for user
def task_exists(session: Session, task_id: int, user_id: str) -> bool:
    statement = select(Task).where(
        Task.id == task_id,
        Task.user_id == user_id,
    )
    return session.exec(statement).first() is not None
```

---

## Environment Variables

### Backend .env File

```bash
# backend/.env

# Neon PostgreSQL connection string
# Format: postgresql://user:password@endpoint.region.neon.tech/database?sslmode=require
DATABASE_URL=postgresql://neondb_owner:abc123xyz@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require

# Optional: Environment mode
ENVIRONMENT=development
```

### .env.example (Commit This)

```bash
# backend/.env.example

# Get this from Neon dashboard → Connection Details
DATABASE_URL=postgresql://user:password@endpoint.neon.tech/database?sslmode=require

ENVIRONMENT=development
```

### Access in Code

```python
# db.py
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Optional: Get with default
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
```

### .gitignore

```gitignore
# Never commit these files
.env
.env.local
.env.*.local

# Do commit the example
!.env.example
```

---

## Migrations

### Simple Approach (Hackathon)

For hackathons, use `create_tables()` on startup:

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from db import create_tables

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if they don't exist
    print("Creating database tables...")
    create_tables()
    print("Tables ready!")

    yield

    # Shutdown
    print("Shutting down...")


app = FastAPI(lifespan=lifespan)
```

**Limitations:**
- Only creates new tables
- Does NOT modify existing tables
- Does NOT delete removed columns
- Does NOT rename columns

### Production Approach (Alembic)

For production, use Alembic for version-controlled migrations:

```bash
# Install Alembic
pip install alembic

# Initialize Alembic
alembic init alembic
```

```python
# alembic/env.py
from models import SQLModel
target_metadata = SQLModel.metadata
```

```bash
# Create migration
alembic revision --autogenerate -m "Add priority column to tasks"

# Apply migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Manual Migration Script

For simple schema changes during hackathon:

```python
# migrate.py
from sqlalchemy import text
from db import engine

def add_priority_column():
    """Add priority column to tasks table if it doesn't exist."""

    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'task' AND column_name = 'priority'
        """))

        if not result.fetchone():
            # Add column
            conn.execute(text("""
                ALTER TABLE task
                ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'
            """))
            conn.commit()
            print("Added priority column")
        else:
            print("Priority column already exists")


if __name__ == "__main__":
    add_priority_column()
```

---

## Best Practices

### 1. Always Index Foreign Keys

```python
# CORRECT - Indexed foreign key
user_id: str = Field(
    foreign_key="user.id",
    index=True,  # ← ADD THIS
)

# WRONG - Missing index (slow queries at scale)
user_id: str = Field(foreign_key="user.id")
```

### 2. Index Frequently Filtered Columns

```python
# Columns to always index:
# - user_id (every query filters by this)
# - completed (filter active/done)
# - email (login queries)
# - created_at (if used in ORDER BY)

__table_args__ = (
    Index("ix_task_user_id", "user_id"),
    Index("ix_task_completed", "completed"),
    Index("ix_task_user_completed", "user_id", "completed"),
)
```

### 3. Use Transactions (Automatic with Session)

```python
# SQLModel Session handles transactions automatically

def transfer_tasks(session: Session, from_user: str, to_user: str):
    """Move all tasks from one user to another (atomic operation)."""

    # All operations in this session are one transaction
    tasks = session.exec(
        select(Task).where(Task.user_id == from_user)
    ).all()

    for task in tasks:
        task.user_id = to_user
        session.add(task)

    # Either ALL tasks move, or NONE do
    session.commit()
```

### 4. Handle Connection Errors

```python
from sqlalchemy.exc import OperationalError, IntegrityError

def create_task_safe(session: Session, task_data: dict) -> Task | None:
    """Create task with error handling."""

    try:
        task = Task(**task_data)
        session.add(task)
        session.commit()
        session.refresh(task)
        return task

    except IntegrityError:
        session.rollback()
        print("Integrity error - duplicate or invalid reference")
        return None

    except OperationalError:
        session.rollback()
        print("Database connection error")
        return None
```

### 5. Close Sessions Properly

```python
# CORRECT - Use context manager (automatically closes)
with Session(engine) as session:
    tasks = session.exec(select(Task)).all()
# Session closed automatically

# CORRECT - Use FastAPI Depends (automatically closes)
@app.get("/tasks")
def get_tasks(session: Session = Depends(get_session)):
    return session.exec(select(Task)).all()
# Session closed automatically after response

# WRONG - Manual session without close
session = Session(engine)
tasks = session.exec(select(Task)).all()
# Session never closed! Memory leak!
```

### 6. Filter by user_id on ALL Queries

```python
# CRITICAL: Multi-tenant security

# EVERY query that returns user data MUST filter by user_id
statement = select(Task).where(Task.user_id == user_id)

# EVERY update MUST verify user_id
task = session.exec(
    select(Task).where(Task.id == task_id, Task.user_id == user_id)
).first()

# EVERY delete MUST verify user_id
task = session.exec(
    select(Task).where(Task.id == task_id, Task.user_id == user_id)
).first()
if task:
    session.delete(task)
```

---

## Common Errors

### Error: "relation does not exist"

```
sqlalchemy.exc.ProgrammingError: (psycopg2.errors.UndefinedTable)
relation "task" does not exist
```

**Cause:** Table hasn't been created in database

**Solution:**

```python
# Call create_tables() before any queries
from db import create_tables

create_tables()  # Creates all SQLModel tables
```

### Error: "connection refused"

```
sqlalchemy.exc.OperationalError: (psycopg2.OperationalError)
could not connect to server: Connection refused
```

**Cause:** Cannot connect to database

**Solution:**

1. Check DATABASE_URL is correct
2. Verify Neon project is running (not suspended)
3. Check network/firewall allows connection
4. Verify password has no special characters (or URL-encode them)

```python
# Verify URL in code
print(f"Connecting to: {DATABASE_URL[:50]}...")  # Don't print full password!
```

### Error: "authentication failed"

```
psycopg2.OperationalError: FATAL: password authentication failed for user "neondb_owner"
```

**Cause:** Wrong username or password

**Solution:**

1. Go to Neon dashboard
2. Click "Connection Details"
3. Copy fresh connection string
4. Update .env file

### Error: "SSL connection is required"

```
psycopg2.OperationalError: SSL connection is required
```

**Cause:** Neon requires SSL, but connection string missing `sslmode`

**Solution:**

```bash
# Add ?sslmode=require to connection string
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
```

### Error: "no such column"

```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError)
no such column: task.priority
```

**Cause:** Column added to model but not to database

**Solution:**

```python
# Option 1: Drop and recreate (loses data!)
from db import drop_tables, create_tables
drop_tables()
create_tables()

# Option 2: Manual migration
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text("ALTER TABLE task ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'"))
    conn.commit()
```

### Error: "Foreign key violation"

```
psycopg2.errors.ForeignKeyViolation: insert or update on table "task"
violates foreign key constraint "task_user_id_fkey"
```

**Cause:** Creating task with user_id that doesn't exist in users table

**Solution:**

```python
# Verify user exists before creating task
user = session.get(User, user_id)
if not user:
    raise ValueError(f"User {user_id} does not exist")

task = Task(user_id=user_id, title="...")
```

---

## Connection Pooling for Neon

Neon uses serverless PostgreSQL with automatic scaling. Configure connection pooling for optimal performance:

```python
# db.py
engine = create_engine(
    DATABASE_URL,
    # Pool Configuration
    pool_size=5,           # Persistent connections
    max_overflow=10,       # Extra connections when needed
    pool_timeout=30,       # Wait time for connection
    pool_recycle=300,      # Recycle connections every 5 min
    pool_pre_ping=True,    # Verify connection before use

    # Neon-specific: Handle cold starts
    connect_args={
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
)
```

### Why `pool_pre_ping=True`?

Neon may suspend inactive databases. `pool_pre_ping` checks if the connection is alive before using it, preventing "connection closed" errors after idle periods.
