# MCP Tools Implementation Skill

## Purpose
Guide implementation of 5 MCP (Model Context Protocol) tools for task management that the AI agent will call via OpenAI function calling.

---

## 5 Required Tools

| Tool | Purpose | Required Params |
|------|---------|-----------------|
| `add_task` | Create a new task | user_id, title, description (optional) |
| `list_tasks` | Get user's tasks | user_id, status (all/pending/completed) |
| `complete_task` | Mark task as done | user_id, task_id |
| `delete_task` | Remove a task | user_id, task_id |
| `update_task` | Modify task details | user_id, task_id, title, description |

---

## Core Principles

### 1. User Isolation (CRITICAL)
Every database query MUST filter by `user_id`:

```python
# CORRECT - Always filter by user_id
tasks = session.exec(
    select(Task).where(Task.user_id == user_id)
).all()

# WRONG - Never query without user isolation
tasks = session.exec(select(Task)).all()  # SECURITY RISK!
```

### 2. Consistent Return Format
All tools return the same structure:

```python
{
    "success": True,
    "task": {
        "task_id": "uuid-string",
        "title": "Task title",
        "description": "Task description",
        "status": "pending",  # or "completed"
        "created_at": "2024-01-15T10:30:00Z"
    },
    "message": "Human-readable result"
}

# For list_tasks:
{
    "success": True,
    "tasks": [...],
    "count": 5,
    "message": "Found 5 tasks"
}

# For errors:
{
    "success": False,
    "error": "Task not found"
}
```

---

## Database Model

```python
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field
import uuid

class Task(SQLModel, table=True):
    """Task model with user isolation."""

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True
    )
    user_id: str = Field(index=True)  # REQUIRED for isolation
    title: str = Field(min_length=1, max_length=500)
    description: Optional[str] = Field(default=None, max_length=2000)
    completed: bool = Field(default=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    def to_response(self) -> dict:
        """Convert to API response format."""
        return {
            "task_id": self.id,
            "title": self.title,
            "description": self.description,
            "status": "completed" if self.completed else "pending",
            "created_at": self.created_at.isoformat()
        }
```

---

## Tool Implementations

### 1. add_task

```python
async def handle_add_task(
    user_id: str,
    title: str,
    description: Optional[str] = None,
    session: Session = None
) -> dict:
    """
    Create a new task for the user.

    Args:
        user_id: Owner of the task (for isolation)
        title: Task title (required)
        description: Optional task description
        session: Database session

    Returns:
        Success response with created task or error
    """
    try:
        # Validate input
        if not title or not title.strip():
            return {
                "success": False,
                "error": "Title is required"
            }

        # Create task
        task = Task(
            user_id=user_id,
            title=title.strip(),
            description=description.strip() if description else None
        )

        session.add(task)
        session.commit()
        session.refresh(task)

        return {
            "success": True,
            "task": task.to_response(),
            "message": f"Created task: {task.title}"
        }

    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "error": f"Failed to create task: {str(e)}"
        }
```

### 2. list_tasks

```python
async def handle_list_tasks(
    user_id: str,
    status: str = "all",
    session: Session = None
) -> dict:
    """
    List tasks for the user with optional status filter.

    Args:
        user_id: Owner of tasks (for isolation)
        status: Filter - "all", "pending", or "completed"
        session: Database session

    Returns:
        Success response with task list or error
    """
    try:
        # Build query with user isolation
        query = select(Task).where(Task.user_id == user_id)

        # Apply status filter
        if status == "pending":
            query = query.where(Task.completed == False)
        elif status == "completed":
            query = query.where(Task.completed == True)
        # "all" - no additional filter

        # Order by creation date (newest first)
        query = query.order_by(Task.created_at.desc())

        tasks = session.exec(query).all()

        return {
            "success": True,
            "tasks": [task.to_response() for task in tasks],
            "count": len(tasks),
            "message": f"Found {len(tasks)} {status} task(s)"
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to list tasks: {str(e)}"
        }
```

### 3. complete_task

```python
async def handle_complete_task(
    user_id: str,
    task_id: str,
    session: Session = None
) -> dict:
    """
    Mark a task as completed.

    Args:
        user_id: Owner of task (for isolation)
        task_id: ID of task to complete
        session: Database session

    Returns:
        Success response with updated task or error
    """
    try:
        # Find task with user isolation
        task = session.exec(
            select(Task).where(
                Task.id == task_id,
                Task.user_id == user_id  # CRITICAL: User isolation
            )
        ).first()

        if not task:
            return {
                "success": False,
                "error": "Task not found"
            }

        # Check if already completed
        if task.completed:
            return {
                "success": True,
                "task": task.to_response(),
                "message": f"Task '{task.title}' was already completed"
            }

        # Mark as completed
        task.completed = True
        task.updated_at = datetime.now(timezone.utc)

        session.add(task)
        session.commit()
        session.refresh(task)

        return {
            "success": True,
            "task": task.to_response(),
            "message": f"Completed task: {task.title}"
        }

    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "error": f"Failed to complete task: {str(e)}"
        }
```

### 4. delete_task

```python
async def handle_delete_task(
    user_id: str,
    task_id: str,
    session: Session = None
) -> dict:
    """
    Delete a task permanently.

    Args:
        user_id: Owner of task (for isolation)
        task_id: ID of task to delete
        session: Database session

    Returns:
        Success response or error
    """
    try:
        # Find task with user isolation
        task = session.exec(
            select(Task).where(
                Task.id == task_id,
                Task.user_id == user_id  # CRITICAL: User isolation
            )
        ).first()

        if not task:
            return {
                "success": False,
                "error": "Task not found"
            }

        # Store info before deletion
        task_title = task.title
        task_response = task.to_response()

        # Delete task
        session.delete(task)
        session.commit()

        return {
            "success": True,
            "task": task_response,
            "message": f"Deleted task: {task_title}"
        }

    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "error": f"Failed to delete task: {str(e)}"
        }
```

### 5. update_task

```python
async def handle_update_task(
    user_id: str,
    task_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    session: Session = None
) -> dict:
    """
    Update a task's details.

    Args:
        user_id: Owner of task (for isolation)
        task_id: ID of task to update
        title: New title (optional)
        description: New description (optional)
        session: Database session

    Returns:
        Success response with updated task or error
    """
    try:
        # Find task with user isolation
        task = session.exec(
            select(Task).where(
                Task.id == task_id,
                Task.user_id == user_id  # CRITICAL: User isolation
            )
        ).first()

        if not task:
            return {
                "success": False,
                "error": "Task not found"
            }

        # Check if anything to update
        if title is None and description is None:
            return {
                "success": False,
                "error": "No updates provided. Specify title or description."
            }

        # Apply updates
        if title is not None:
            if not title.strip():
                return {
                    "success": False,
                    "error": "Title cannot be empty"
                }
            task.title = title.strip()

        if description is not None:
            task.description = description.strip() if description else None

        task.updated_at = datetime.now(timezone.utc)

        session.add(task)
        session.commit()
        session.refresh(task)

        return {
            "success": True,
            "task": task.to_response(),
            "message": f"Updated task: {task.title}"
        }

    except Exception as e:
        session.rollback()
        return {
            "success": False,
            "error": f"Failed to update task: {str(e)}"
        }
```

---

## Tool Executor (Router)

```python
from typing import Callable, Any

# Tool registry
TOOL_HANDLERS: dict[str, Callable] = {
    "add_task": handle_add_task,
    "list_tasks": handle_list_tasks,
    "complete_task": handle_complete_task,
    "delete_task": handle_delete_task,
    "update_task": handle_update_task,
}

async def execute_tool(
    user_id: str,
    function_name: str,
    arguments: dict,
    session: Session
) -> dict:
    """
    Route tool calls to appropriate handlers.

    Args:
        user_id: User ID for isolation (injected, not from AI)
        function_name: Name of tool to execute
        arguments: Arguments from OpenAI function call
        session: Database session

    Returns:
        Tool execution result
    """
    handler = TOOL_HANDLERS.get(function_name)

    if not handler:
        return {
            "success": False,
            "error": f"Unknown tool: {function_name}"
        }

    try:
        # IMPORTANT: Always inject user_id from authenticated context
        # Never trust user_id from AI arguments
        result = await handler(
            user_id=user_id,  # From JWT, not AI
            session=session,
            **arguments
        )
        return result

    except TypeError as e:
        return {
            "success": False,
            "error": f"Invalid arguments: {str(e)}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Tool execution failed: {str(e)}"
        }
```

---

## OpenAI Function Definitions

```python
TASK_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "add_task",
            "description": "Create a new task for the user",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "The task title"
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional task description"
                    }
                },
                "required": ["title"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_tasks",
            "description": "List all tasks, optionally filtered by status",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["all", "pending", "completed"],
                        "description": "Filter tasks by status"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "complete_task",
            "description": "Mark a task as completed",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The ID of the task to complete"
                    }
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": "Delete a task permanently",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The ID of the task to delete"
                    }
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": "Update a task's title or description",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "string",
                        "description": "The ID of the task to update"
                    },
                    "title": {
                        "type": "string",
                        "description": "New title for the task"
                    },
                    "description": {
                        "type": "string",
                        "description": "New description for the task"
                    }
                },
                "required": ["task_id"]
            }
        }
    }
]
```

---

## File Structure

```
backend/app/
├── tools/
│   ├── __init__.py
│   ├── definitions.py      # TASK_TOOLS definitions
│   ├── executor.py         # execute_tool router
│   └── handlers/
│       ├── __init__.py
│       ├── add_task.py
│       ├── list_tasks.py
│       ├── complete_task.py
│       ├── delete_task.py
│       └── update_task.py
```

---

## Security Checklist

- [ ] All queries filter by `user_id`
- [ ] `user_id` comes from JWT token, NOT from AI/request body
- [ ] Input validation on all parameters
- [ ] SQL injection prevented (using SQLModel ORM)
- [ ] Error messages don't leak sensitive info
- [ ] Database transactions properly committed/rolled back

---

## Testing

```python
import pytest
from sqlmodel import Session

@pytest.fixture
def test_user_id():
    return "test-user-123"

@pytest.fixture
def other_user_id():
    return "other-user-456"

async def test_user_isolation(session: Session, test_user_id, other_user_id):
    """Ensure users can only see their own tasks."""

    # Create task for test user
    result = await handle_add_task(
        user_id=test_user_id,
        title="My task",
        session=session
    )
    task_id = result["task"]["task_id"]

    # Other user should NOT see this task
    result = await handle_list_tasks(
        user_id=other_user_id,
        session=session
    )
    assert result["count"] == 0

    # Other user should NOT be able to complete it
    result = await handle_complete_task(
        user_id=other_user_id,
        task_id=task_id,
        session=session
    )
    assert result["success"] == False
    assert result["error"] == "Task not found"

async def test_add_task(session: Session, test_user_id):
    """Test task creation."""
    result = await handle_add_task(
        user_id=test_user_id,
        title="Buy groceries",
        description="Milk, eggs, bread",
        session=session
    )

    assert result["success"] == True
    assert result["task"]["title"] == "Buy groceries"
    assert result["task"]["status"] == "pending"

async def test_complete_task(session: Session, test_user_id):
    """Test marking task complete."""
    # Create task
    create_result = await handle_add_task(
        user_id=test_user_id,
        title="Test task",
        session=session
    )
    task_id = create_result["task"]["task_id"]

    # Complete it
    result = await handle_complete_task(
        user_id=test_user_id,
        task_id=task_id,
        session=session
    )

    assert result["success"] == True
    assert result["task"]["status"] == "completed"
```

---

## References

- Phase III Specification (Pages 18-19)
- SQLModel Documentation: https://sqlmodel.tiangolo.com/
- Neon PostgreSQL: https://neon.tech/docs
