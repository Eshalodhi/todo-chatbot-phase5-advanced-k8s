# OpenAI Function Calling Integration Skill

## Purpose
Guide implementation of AI chat agent using OpenAI's function calling (tools) API for Phase III task management.

---

## Core Concepts

### 1. OpenAI API with Tools Parameter

```python
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

response = client.chat.completions.create(
    model="gpt-4o-mini",  # or "gpt-4o" for better reasoning
    messages=messages,
    tools=tools,  # Function definitions
    tool_choice="auto"  # Let model decide when to call functions
)
```

### 2. Tool/Function Definitions

Define tools as JSON schema that OpenAI understands:

```python
tools = [
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
                        "description": "The task title/description"
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": "Task priority level"
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Due date in ISO format (YYYY-MM-DD)"
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
            "description": "List all tasks for the user, optionally filtered",
            "parameters": {
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["all", "pending", "completed"],
                        "description": "Filter by task status"
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
            "description": "Update an existing task's details",
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
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high"]
                    },
                    "due_date": {
                        "type": "string",
                        "description": "New due date in ISO format"
                    }
                },
                "required": ["task_id"]
            }
        }
    }
]
```

---

## Function Calling Flow

### Request → Response → Tool Call → Execute → Continue

```python
async def process_chat(user_id: str, user_message: str, session: Session):
    # 1. Load conversation history from database
    conversation = get_or_create_conversation(user_id, session)
    messages = load_message_history(conversation.id, session)

    # 2. Add system prompt (first message)
    if not messages:
        messages.insert(0, {
            "role": "system",
            "content": SYSTEM_PROMPT
        })

    # 3. Add user message
    messages.append({"role": "user", "content": user_message})
    save_message(conversation.id, "user", user_message, session)

    # 4. Call OpenAI API
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        tools=tools,
        tool_choice="auto"
    )

    assistant_message = response.choices[0].message

    # 5. Check if model wants to call a function
    if assistant_message.tool_calls:
        # Process each tool call
        for tool_call in assistant_message.tool_calls:
            function_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            # Execute the function
            result = await execute_tool(
                user_id=user_id,
                function_name=function_name,
                arguments=arguments,
                session=session
            )

            # Add tool response to messages
            messages.append({
                "role": "assistant",
                "content": None,
                "tool_calls": [tool_call]
            })
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result)
            })

        # 6. Get final response after tool execution
        final_response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages
        )
        assistant_content = final_response.choices[0].message.content
    else:
        # No tool call, use direct response
        assistant_content = assistant_message.content

    # 7. Save assistant response
    save_message(conversation.id, "assistant", assistant_content, session)

    return {"response": assistant_content}
```

---

## System Prompt (Agent Instructions)

```python
SYSTEM_PROMPT = """You are a helpful task management assistant. You help users manage their tasks by:

1. **Adding tasks**: When users want to create a new task, use the add_task function.
   - Extract the task title from their message
   - Infer priority if mentioned (e.g., "urgent" = high, "whenever" = low)
   - Parse due dates if mentioned (e.g., "tomorrow", "next Monday", "Dec 25")

2. **Listing tasks**: When users want to see their tasks, use the list_tasks function.
   - "Show my tasks" → list all
   - "What's pending?" → filter by pending
   - "What did I complete?" → filter by completed

3. **Completing tasks**: When users indicate a task is done, use complete_task.
   - Match task by ID or help them find the right task first

4. **Deleting tasks**: When users want to remove a task, use delete_task.
   - Confirm before deleting if the request is ambiguous

5. **Updating tasks**: When users want to modify a task, use update_task.
   - Can update title, priority, or due date

**Guidelines:**
- Be concise and helpful
- If unsure which task the user means, list their tasks first and ask for clarification
- Always confirm destructive actions (delete) unless user is explicit
- Format task lists nicely with priorities and due dates
- Use natural language to summarize what you did after each action
"""
```

---

## Message Format Reference

### Message Types

```python
# System message (sets agent behavior)
{"role": "system", "content": "You are a helpful assistant..."}

# User message
{"role": "user", "content": "Add a task to buy groceries"}

# Assistant message (text response)
{"role": "assistant", "content": "I've added 'Buy groceries' to your tasks!"}

# Assistant message (with tool call)
{
    "role": "assistant",
    "content": None,
    "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
            "name": "add_task",
            "arguments": "{\"title\": \"Buy groceries\", \"priority\": \"medium\"}"
        }
    }]
}

# Tool result message
{
    "role": "tool",
    "tool_call_id": "call_abc123",
    "content": "{\"success\": true, \"task\": {\"id\": \"123\", \"title\": \"Buy groceries\"}}"
}
```

---

## Stateless Design Pattern

### Key Principles

1. **No server-side state**: Don't store conversation in memory
2. **Load from DB**: Fetch conversation history on each request
3. **Save to DB**: Persist each message after processing
4. **User isolation**: Always filter by user_id

### Database Models

```python
class Conversation(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Message(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    conversation_id: str = Field(foreign_key="conversation.id", index=True)
    role: str  # "system", "user", "assistant", "tool"
    content: Optional[str] = None
    tool_calls: Optional[str] = None  # JSON string
    tool_call_id: Optional[str] = None  # For tool responses
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

### History Loading

```python
def load_message_history(conversation_id: str, session: Session) -> list[dict]:
    """Load messages and convert to OpenAI format."""
    messages = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    ).all()

    result = []
    for msg in messages:
        if msg.role == "tool":
            result.append({
                "role": "tool",
                "tool_call_id": msg.tool_call_id,
                "content": msg.content
            })
        elif msg.tool_calls:
            result.append({
                "role": "assistant",
                "content": msg.content,
                "tool_calls": json.loads(msg.tool_calls)
            })
        else:
            result.append({
                "role": msg.role,
                "content": msg.content
            })

    return result
```

---

## Tool Executor Pattern

```python
async def execute_tool(
    user_id: str,
    function_name: str,
    arguments: dict,
    session: Session
) -> dict:
    """Route tool calls to appropriate handlers."""

    # Always inject user_id for isolation
    arguments["user_id"] = user_id

    handlers = {
        "add_task": handle_add_task,
        "list_tasks": handle_list_tasks,
        "complete_task": handle_complete_task,
        "delete_task": handle_delete_task,
        "update_task": handle_update_task,
    }

    handler = handlers.get(function_name)
    if not handler:
        return {"error": f"Unknown function: {function_name}"}

    try:
        return await handler(session=session, **arguments)
    except Exception as e:
        return {"error": str(e)}
```

---

## Best Practices

### 1. Error Handling

```python
try:
    response = client.chat.completions.create(...)
except openai.RateLimitError:
    return {"error": "Rate limited, please try again later"}
except openai.APIError as e:
    return {"error": f"API error: {str(e)}"}
```

### 2. Token Management

```python
# Limit conversation history to avoid token limits
MAX_HISTORY_MESSAGES = 20

def load_message_history(conversation_id, session):
    messages = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(MAX_HISTORY_MESSAGES)
    ).all()
    return list(reversed(messages))  # Chronological order
```

### 3. Input Validation

```python
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
```

### 4. Consistent Tool Return Format

```python
# Always return consistent structure
def handle_add_task(...) -> dict:
    return {
        "success": True,
        "task": task.model_dump(),
        "message": f"Created task: {task.title}"
    }

def handle_error(error: str) -> dict:
    return {
        "success": False,
        "error": error
    }
```

### 5. Logging

```python
import logging
logger = logging.getLogger(__name__)

# Log tool calls for debugging
logger.info(f"Tool call: {function_name} with args: {arguments}")
logger.info(f"Tool result: {result}")
```

---

## API Endpoint Structure

```python
@router.post("/{user_id}/chat")
async def chat(
    user_id: str,
    request: ChatRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)  # JWT auth
) -> ChatResponse:
    """
    Process a chat message and return AI response.
    May execute tool calls for task management.
    """
    # Verify user owns this conversation
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await process_chat(user_id, request.message, session)
    return ChatResponse(**result)
```

---

## Environment Variables

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini  # or gpt-4o
```

---

## References

- [OpenAI Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference/chat/create)
- [OpenAI Python SDK](https://github.com/openai/openai-python)
