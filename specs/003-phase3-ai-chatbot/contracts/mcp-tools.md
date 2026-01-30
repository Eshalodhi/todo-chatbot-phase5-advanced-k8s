# MCP Tools Contract: Phase III AI Chatbot

**Feature Branch**: `003-phase3-ai-chatbot`
**Created**: 2026-01-17
**Status**: Complete

## Overview

This document defines the 5 MCP (Model Context Protocol) tools that the AI chatbot uses to manage tasks. These tools are registered with Cohere's function calling system and executed by the backend when the AI determines they should be called.

## Tool Definitions (Cohere Format)

### Tool 1: add_task

**Purpose**: Create a new task for the user.

```python
{
    "type": "function",
    "function": {
        "name": "add_task",
        "description": "Creates a new task for the user. Use this when the user wants to add, create, remember, or note something they need to do.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "The title or name of the task (1-200 characters)"
                },
                "description": {
                    "type": "string",
                    "description": "Optional additional details about the task (max 1000 characters)"
                }
            },
            "required": ["title"]
        }
    }
}
```

**Return Format**:
```json
{
    "success": true,
    "message": "Task 'Buy groceries' created successfully",
    "data": {
        "task_id": 123,
        "status": "created",
        "title": "Buy groceries"
    }
}
```

**Error Cases**:
| Error | Message | Data |
|-------|---------|------|
| Empty title | "Task title cannot be empty" | `null` |
| Title too long | "Task title exceeds 200 characters" | `null` |
| Database error | "Failed to create task" | `null` |

---

### Tool 2: list_tasks

**Purpose**: Retrieve the user's tasks with optional filtering.

```python
{
    "type": "function",
    "function": {
        "name": "list_tasks",
        "description": "Lists all tasks for the user. Use this when the user wants to see, view, show, or list their tasks or todos. Can filter by status.",
        "parameters": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["all", "pending", "completed"],
                    "description": "Filter tasks by status. 'all' returns everything, 'pending' returns incomplete tasks, 'completed' returns finished tasks. Default is 'all'."
                }
            },
            "required": []
        }
    }
}
```

**Return Format**:
```json
{
    "success": true,
    "message": "Found 3 tasks",
    "data": {
        "tasks": [
            {
                "id": 123,
                "title": "Buy groceries",
                "description": null,
                "is_completed": false,
                "created_at": "2026-01-17T10:00:00Z"
            },
            {
                "id": 124,
                "title": "Call mom",
                "description": "Discuss weekend plans",
                "is_completed": true,
                "created_at": "2026-01-16T15:30:00Z"
            }
        ],
        "count": 2,
        "filter": "all"
    }
}
```

**Error Cases**:
| Error | Message | Data |
|-------|---------|------|
| Invalid status | "Invalid status filter" | `null` |
| Database error | "Failed to retrieve tasks" | `null` |

---

### Tool 3: complete_task

**Purpose**: Mark a task as completed.

```python
{
    "type": "function",
    "function": {
        "name": "complete_task",
        "description": "Marks a task as complete/done. Use this when the user indicates they have finished, completed, or done a task.",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "integer",
                    "description": "The ID of the task to mark as complete"
                },
                "task_identifier": {
                    "type": "string",
                    "description": "A text identifier to find the task (partial title match). Use this if task_id is not known."
                }
            },
            "required": []
        }
    }
}
```

**Note**: Either `task_id` or `task_identifier` should be provided. If `task_identifier` is used, the system will attempt to match it against task titles.

**Return Format**:
```json
{
    "success": true,
    "message": "Task 'Buy groceries' marked as complete",
    "data": {
        "task_id": 123,
        "status": "completed",
        "title": "Buy groceries"
    }
}
```

**Error Cases**:
| Error | Message | Data |
|-------|---------|------|
| Task not found | "No task found matching 'groceries'" | `null` |
| Multiple matches | "Multiple tasks found matching 'task'. Please be more specific." | `{"matches": ["Task 1", "Task 2"]}` |
| Already complete | "Task is already complete" | `{"task_id": 123}` |
| No identifier | "Please specify which task to complete" | `null` |

---

### Tool 4: delete_task

**Purpose**: Permanently remove a task.

```python
{
    "type": "function",
    "function": {
        "name": "delete_task",
        "description": "Deletes/removes a task permanently. Use this when the user wants to delete, remove, or cancel a task.",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "integer",
                    "description": "The ID of the task to delete"
                },
                "task_identifier": {
                    "type": "string",
                    "description": "A text identifier to find the task (partial title match). Use this if task_id is not known."
                }
            },
            "required": []
        }
    }
}
```

**Return Format**:
```json
{
    "success": true,
    "message": "Task 'Buy groceries' has been deleted",
    "data": {
        "task_id": 123,
        "status": "deleted",
        "title": "Buy groceries"
    }
}
```

**Error Cases**:
| Error | Message | Data |
|-------|---------|------|
| Task not found | "No task found matching 'groceries'" | `null` |
| Multiple matches | "Multiple tasks found. Please be more specific." | `{"matches": ["Task 1", "Task 2"]}` |
| No identifier | "Please specify which task to delete" | `null` |

---

### Tool 5: update_task

**Purpose**: Modify an existing task's title or description.

```python
{
    "type": "function",
    "function": {
        "name": "update_task",
        "description": "Updates/modifies an existing task. Use this when the user wants to change, update, modify, or edit a task's title or description.",
        "parameters": {
            "type": "object",
            "properties": {
                "task_id": {
                    "type": "integer",
                    "description": "The ID of the task to update"
                },
                "task_identifier": {
                    "type": "string",
                    "description": "A text identifier to find the task (partial title match). Use this if task_id is not known."
                },
                "new_title": {
                    "type": "string",
                    "description": "The new title for the task (1-200 characters)"
                },
                "new_description": {
                    "type": "string",
                    "description": "The new description for the task (optional)"
                }
            },
            "required": []
        }
    }
}
```

**Return Format**:
```json
{
    "success": true,
    "message": "Task updated from 'Buy groceries' to 'Buy organic groceries'",
    "data": {
        "task_id": 123,
        "status": "updated",
        "title": "Buy organic groceries",
        "previous_title": "Buy groceries"
    }
}
```

**Error Cases**:
| Error | Message | Data |
|-------|---------|------|
| Task not found | "No task found matching 'groceries'" | `null` |
| No changes | "No changes specified" | `null` |
| Title too long | "New title exceeds 200 characters" | `null` |

---

## Implementation Guidelines

### User Isolation

**CRITICAL**: All tools MUST filter by `user_id` in database queries:

```python
# CORRECT
task = session.exec(
    select(Task)
    .where(Task.id == task_id)
    .where(Task.user_id == user_id)  # REQUIRED
).first()

# WRONG - Security vulnerability!
task = session.get(Task, task_id)  # Missing user_id filter
```

### Task Identifier Matching

When `task_identifier` is provided instead of `task_id`, use fuzzy matching:

```python
def find_task_by_identifier(
    session: Session,
    user_id: str,
    identifier: str
) -> tuple[Task | None, list[Task]]:
    """Find task by partial title match.

    Returns:
        (task, matches) - task if exactly one match, None and list of matches otherwise
    """
    # Case-insensitive partial match
    statement = (
        select(Task)
        .where(Task.user_id == user_id)
        .where(Task.title.ilike(f"%{identifier}%"))
    )
    matches = list(session.exec(statement).all())

    if len(matches) == 1:
        return matches[0], matches
    return None, matches
```

### Consistent Return Format

All tools MUST return this structure:

```python
@dataclass
class ToolResult:
    success: bool
    message: str
    data: dict | None = None

    def to_dict(self) -> dict:
        return {
            "success": self.success,
            "message": self.message,
            "data": self.data
        }
```

### Error Handling

Tools should never expose database errors to the AI. Instead, return user-friendly messages:

```python
try:
    # Database operation
    session.add(task)
    session.commit()
except SQLAlchemyError as e:
    logger.error(f"Database error in add_task: {e}")
    return ToolResult(
        success=False,
        message="Unable to create task. Please try again.",
        data=None
    )
```

---

## Tool Executor Pattern

The tool executor routes Cohere tool calls to the appropriate handlers:

```python
class ToolExecutor:
    def __init__(self, session: Session):
        self.session = session
        self.handlers = {
            "add_task": self._add_task,
            "list_tasks": self._list_tasks,
            "complete_task": self._complete_task,
            "delete_task": self._delete_task,
            "update_task": self._update_task,
        }

    async def execute(
        self,
        tool_name: str,
        user_id: str,
        parameters: dict
    ) -> ToolResult:
        """Execute a tool by name with user isolation."""
        handler = self.handlers.get(tool_name)
        if not handler:
            return ToolResult(
                success=False,
                message=f"Unknown tool: {tool_name}"
            )

        return await handler(user_id=user_id, **parameters)
```

---

## Natural Language Patterns

The AI should recognize these patterns and map them to tools:

| Pattern | Tool | Example |
|---------|------|---------|
| "add", "create", "new", "remember", "remind me", "note" | add_task | "Add a task to call mom" |
| "show", "list", "what are", "display", "see" | list_tasks | "What are my tasks?" |
| "done", "complete", "finish", "completed", "mark as done" | complete_task | "Mark groceries as done" |
| "delete", "remove", "cancel", "get rid of" | delete_task | "Delete the old task" |
| "update", "change", "modify", "edit", "rename" | update_task | "Change task 1 to 'Call dad'" |
