# Cohere API Integration Specification

**Parent Spec**: [Phase III AI Chatbot](./spec.md)
**Created**: 2026-01-16
**Status**: Draft

## Overview

Integration with Cohere's `command-r-plus` model for natural language understanding and tool calling in the todo chatbot.

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| AI Model | `command-r-plus` | Latest |
| SDK | `cohere-ai` | ^5.0.0 |
| Runtime | Python | 3.11+ |

## Configuration

### Environment Variables

```bash
# Required - Cohere API credentials
COHERE_API_KEY=your_api_key_here

# Optional - Model configuration
COHERE_MODEL=command-r-plus
COHERE_TEMPERATURE=0.3
COHERE_MAX_TOKENS=1024
```

### Client Initialization

```python
import cohere
from app.core.config import settings

# Initialize Cohere client
cohere_client = cohere.Client(api_key=settings.COHERE_API_KEY)
```

## API Integration Pattern

### 9-Step Stateless Flow

```
1. Frontend sends message + conversation_id (optional)
2. Backend verifies JWT, extracts user_id
3. Backend loads conversation history from DB (if exists)
4. Backend formats messages for Cohere API
5. Backend calls Cohere with tools definition
6. Cohere returns response (may include tool_calls)
7. Backend executes any tool_calls
8. Backend persists messages to DB
9. Backend returns response to frontend
```

### Cohere Chat Request Format

```python
response = cohere_client.chat(
    model="command-r-plus",
    message=user_message,
    chat_history=formatted_history,
    tools=tool_definitions,
    temperature=0.3,
    preamble=system_prompt
)
```

### System Prompt (Preamble)

```python
SYSTEM_PROMPT = """You are a helpful task management assistant. You help users manage their todo list through natural conversation.

You have access to the following tools:
- add_task: Create a new task
- list_tasks: Show all tasks or filter by status
- complete_task: Mark a task as done
- delete_task: Remove a task
- update_task: Modify a task's title

Always be concise and helpful. When a user asks to do something with their tasks, use the appropriate tool. If you're unsure what the user wants, ask for clarification.

Important:
- Only manage tasks for the authenticated user
- Confirm actions after completing them
- Be friendly but professional
"""
```

## Tool Definitions

### Cohere Tool Schema Format

```python
TOOL_DEFINITIONS = [
    {
        "name": "add_task",
        "description": "Create a new task for the user",
        "parameter_definitions": {
            "title": {
                "type": "str",
                "description": "The title/description of the task to create",
                "required": True
            }
        }
    },
    {
        "name": "list_tasks",
        "description": "List all tasks or filter by completion status",
        "parameter_definitions": {
            "status": {
                "type": "str",
                "description": "Filter by status: 'all', 'pending', or 'completed'",
                "required": False
            }
        }
    },
    {
        "name": "complete_task",
        "description": "Mark a task as completed",
        "parameter_definitions": {
            "task_identifier": {
                "type": "str",
                "description": "The task title or ID to complete",
                "required": True
            }
        }
    },
    {
        "name": "delete_task",
        "description": "Delete/remove a task",
        "parameter_definitions": {
            "task_identifier": {
                "type": "str",
                "description": "The task title or ID to delete",
                "required": True
            }
        }
    },
    {
        "name": "update_task",
        "description": "Update a task's title",
        "parameter_definitions": {
            "task_identifier": {
                "type": "str",
                "description": "The task title or ID to update",
                "required": True
            },
            "new_title": {
                "type": "str",
                "description": "The new title for the task",
                "required": True
            }
        }
    }
]
```

## Response Handling

### Standard Response Structure

```python
@dataclass
class CohereResponse:
    text: str                      # AI response text
    tool_calls: List[ToolCall]     # List of tools to execute
    finish_reason: str             # "COMPLETE" or "TOOL_CALL"
```

### Tool Call Handling

```python
async def process_cohere_response(response, user_id: str):
    """Process Cohere response and execute any tool calls."""

    results = []

    if response.tool_calls:
        for tool_call in response.tool_calls:
            # Execute the tool
            result = await execute_tool(
                tool_name=tool_call.name,
                parameters=tool_call.parameters,
                user_id=user_id
            )
            results.append({
                "tool": tool_call.name,
                "result": result
            })

    return {
        "text": response.text,
        "tool_results": results,
        "finish_reason": response.finish_reason
    }
```

## Error Handling

### API Error Types

| Error | HTTP Status | Handling |
|-------|-------------|----------|
| `cohere.errors.BadRequestError` | 400 | Log and return user-friendly message |
| `cohere.errors.UnauthorizedError` | 401 | Check API key configuration |
| `cohere.errors.TooManyRequestsError` | 429 | Implement exponential backoff |
| `cohere.errors.InternalServerError` | 500 | Retry with backoff, then fail gracefully |
| Network timeout | - | Retry once, then return timeout message |

### Error Response Format

```python
class ChatError(Exception):
    def __init__(self, message: str, code: str, retryable: bool = False):
        self.message = message
        self.code = code
        self.retryable = retryable

# Example error handling
try:
    response = cohere_client.chat(...)
except cohere.errors.TooManyRequestsError:
    raise ChatError(
        message="Service is busy. Please try again in a moment.",
        code="RATE_LIMITED",
        retryable=True
    )
```

## Rate Limiting & Retry Logic

### Configuration

```python
RETRY_CONFIG = {
    "max_retries": 3,
    "initial_delay": 1.0,  # seconds
    "backoff_factor": 2.0,
    "max_delay": 10.0
}
```

### Retry Implementation

```python
import asyncio
from functools import wraps

def with_retry(max_retries=3, backoff_factor=2.0):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            delay = 1.0
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except cohere.errors.TooManyRequestsError:
                    if attempt == max_retries - 1:
                        raise
                    await asyncio.sleep(delay)
                    delay *= backoff_factor
        return wrapper
    return decorator
```

## Chat History Formatting

### Converting DB Messages to Cohere Format

```python
def format_chat_history(messages: List[Message]) -> List[dict]:
    """Convert database messages to Cohere chat_history format."""
    history = []

    for msg in messages:
        if msg.role == "user":
            history.append({
                "role": "USER",
                "message": msg.content
            })
        elif msg.role == "assistant":
            history.append({
                "role": "CHATBOT",
                "message": msg.content
            })
        # Tool messages are handled separately

    return history
```

## Testing Requirements

### Unit Tests

- [ ] Client initialization with valid API key
- [ ] Client initialization fails with invalid API key
- [ ] Chat request formatting is correct
- [ ] Tool definitions are valid schema
- [ ] Response parsing handles all fields
- [ ] Error handling for each error type
- [ ] Retry logic respects configuration
- [ ] Chat history formatting is correct

### Integration Tests

- [ ] End-to-end chat with no tools
- [ ] End-to-end chat with tool call
- [ ] Multiple tool calls in sequence
- [ ] API timeout handling
- [ ] Rate limit handling

## Acceptance Criteria

- [ ] Cohere client initializes successfully with API key from env
- [ ] Chat requests use correct model and temperature
- [ ] Tool definitions are properly formatted for Cohere
- [ ] All 5 tools are recognized by Cohere
- [ ] Tool calls are extracted and executed correctly
- [ ] Errors are caught and user-friendly messages returned
- [ ] Rate limiting triggers appropriate backoff
- [ ] Chat history is properly formatted for context
