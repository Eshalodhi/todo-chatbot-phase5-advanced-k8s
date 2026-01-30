"""
Cohere tool definitions for MCP task management tools.

These definitions follow the Cohere API v2 function calling schema
and are passed to the chat API to enable the AI to call tools.
"""

from typing import Any

# Tool definitions in Cohere API v2 format
TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "add_task",
            "description": (
                "Creates a new task for the user. Use this when the user wants to "
                "add, create, remember, note, or remind themselves about something "
                "they need to do. Supports priority levels and due dates."
            ),
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
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": (
                            "Task priority level. 'high' for urgent/important tasks, "
                            "'medium' for normal tasks (default), 'low' for less urgent tasks."
                        )
                    },
                    "due_date": {
                        "type": "string",
                        "description": (
                            "When the task is due, in ISO 8601 format (e.g., '2024-12-31T10:00:00Z'). "
                            "Use this when the user specifies a deadline or due date."
                        )
                    },
                    "recurrence_pattern": {
                        "type": "string",
                        "enum": ["daily", "weekly", "monthly"],
                        "description": (
                            "Makes the task recurring. When completed, a new instance is "
                            "automatically created. Use 'daily' for every day, 'weekly' for "
                            "every week, 'monthly' for every month."
                        )
                    },
                    "recurrence_end_date": {
                        "type": "string",
                        "description": (
                            "Optional end date for recurrence in ISO 8601 format. "
                            "After this date, no new recurring instances will be created."
                        )
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
            "description": (
                "Lists all tasks for the user. Use this when the user wants to see, "
                "view, show, list, or check their tasks, todos, or things to do. "
                "Supports filtering by status, priority, and due date, plus sorting."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["all", "pending", "completed"],
                        "description": (
                            "Filter tasks by status. 'all' returns everything, "
                            "'pending' returns incomplete tasks, 'completed' returns "
                            "finished tasks. Default is 'all'."
                        )
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": (
                            "Filter tasks by priority level. Only returns tasks "
                            "with the specified priority."
                        )
                    },
                    "sort_by": {
                        "type": "string",
                        "enum": ["created_at", "due_date", "priority"],
                        "description": (
                            "Sort tasks by field. 'created_at' sorts by creation date (default), "
                            "'due_date' sorts by due date, 'priority' sorts by priority level "
                            "(high first, then medium, then low)."
                        )
                    },
                    "due_before": {
                        "type": "string",
                        "description": (
                            "Filter tasks due before this date (ISO 8601 format). "
                            "Example: '2024-12-31T23:59:59Z'"
                        )
                    },
                    "due_after": {
                        "type": "string",
                        "description": (
                            "Filter tasks due after this date (ISO 8601 format). "
                            "Example: '2024-12-01T00:00:00Z'"
                        )
                    },
                    "tags": {
                        "type": "string",
                        "description": (
                            "Filter tasks by tag names (comma-separated). "
                            "Returns tasks that have any of the specified tags."
                        )
                    },
                    "search": {
                        "type": "string",
                        "description": (
                            "Search text to match against task title and description. "
                            "Case-insensitive partial match."
                        )
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "complete_task",
            "description": (
                "Marks a task as complete/done. Use this when the user indicates "
                "they have finished, completed, done, or want to mark a task as done."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task to mark as complete"
                    },
                    "task_identifier": {
                        "type": "string",
                        "description": (
                            "A text identifier to find the task (partial title match). "
                            "Use this if task_id is not known."
                        )
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": (
                "Deletes/removes a task permanently. Use this when the user wants to "
                "delete, remove, cancel, or get rid of a task."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task to delete"
                    },
                    "task_identifier": {
                        "type": "string",
                        "description": (
                            "A text identifier to find the task (partial title match). "
                            "Use this if task_id is not known."
                        )
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": (
                "Updates/modifies an existing task. Use this when the user wants to "
                "change, update, modify, edit, or rename a task's title or description."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task to update"
                    },
                    "task_identifier": {
                        "type": "string",
                        "description": (
                            "A text identifier to find the task (partial title match). "
                            "Use this if task_id is not known."
                        )
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
    },
    {
        "type": "function",
        "function": {
            "name": "set_reminder",
            "description": (
                "Sets a reminder for a task at a specified time. Use this when "
                "the user wants to be reminded about a task at a certain time or date."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task to set a reminder for"
                    },
                    "task_identifier": {
                        "type": "string",
                        "description": (
                            "A text identifier to find the task (partial title match). "
                            "Use this if task_id is not known."
                        )
                    },
                    "remind_at": {
                        "type": "string",
                        "description": (
                            "When to send the reminder, in ISO 8601 format "
                            "(e.g., '2024-12-31T10:00:00Z'). Must be in the future."
                        )
                    }
                },
                "required": ["remind_at"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_reminders",
            "description": (
                "Lists upcoming reminders for the user. Use this when the user "
                "wants to see, check, or view their reminders."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "integer",
                        "description": "Optional task ID to filter reminders for a specific task"
                    },
                    "include_sent": {
                        "type": "boolean",
                        "description": (
                            "Whether to include already-sent reminders. "
                            "Default is false (only shows upcoming reminders)."
                        )
                    }
                },
                "required": []
            }
        }
    }
]


def get_tool_definitions() -> list[dict[str, Any]]:
    """Return the list of tool definitions for Cohere API."""
    return TOOL_DEFINITIONS
