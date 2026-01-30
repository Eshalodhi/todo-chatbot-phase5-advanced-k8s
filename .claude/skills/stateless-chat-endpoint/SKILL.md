# Stateless Chat Endpoint Skill

## Purpose
Guide implementation of `POST /api/{user_id}/chat` endpoint with stateless architecture for AI task management agent.

---

## Endpoint Specification

```
POST /api/{user_id}/chat
Authorization: Bearer <jwt_token>
Content-Type: application/json

Request:
{
    "conversation_id": "uuid" (optional - creates new if omitted),
    "message": "string" (required)
}

Response:
{
    "conversation_id": "uuid",
    "response": "string",
    "tool_calls": [
        {
            "tool": "add_task",
            "arguments": {"title": "..."},
            "result": {"success": true, "task": {...}}
        }
    ]
}
```

---

## Stateless Architecture

### Key Principle
**No server-side state** - Everything persisted in database

```
Each Request:
1. Receive message
2. Fetch conversation history from DB
3. Build OpenAI messages array
4. Call OpenAI API
5. Execute any tool calls
6. Store all messages to DB
7. Return response

Server holds NOTHING between requests.
```

### Why Stateless?
- Horizontal scaling (any server handles any request)
- No session affinity required
- Survives server restarts
- Works with serverless (Vercel, HF Spaces)

---

## Database Models

```python
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship
import uuid
import json

class Conversation(SQLModel, table=True):
    """Conversation session between user and AI."""

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True
    )
    user_id: str = Field(index=True)  # For user isolation
    title: Optional[str] = Field(default=None)  # Auto-generated from first message
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    messages: list["Message"] = Relationship(back_populates="conversation")


class Message(SQLModel, table=True):
    """Individual message in a conversation."""

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        primary_key=True
    )
    conversation_id: str = Field(
        foreign_key="conversation.id",
        index=True
    )
    role: str  # "system", "user", "assistant", "tool"
    content: Optional[str] = None
    tool_calls: Optional[str] = None  # JSON string of tool calls
    tool_call_id: Optional[str] = None  # For tool response messages
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    # Relationship
    conversation: Optional[Conversation] = Relationship(back_populates="messages")

    def to_openai_format(self) -> dict:
        """Convert to OpenAI message format."""
        if self.role == "tool":
            return {
                "role": "tool",
                "tool_call_id": self.tool_call_id,
                "content": self.content
            }
        elif self.tool_calls:
            return {
                "role": "assistant",
                "content": self.content,
                "tool_calls": json.loads(self.tool_calls)
            }
        else:
            return {
                "role": self.role,
                "content": self.content
            }
```

---

## Request/Response Schemas

```python
from pydantic import BaseModel, Field
from typing import Optional

class ChatRequest(BaseModel):
    """Incoming chat request."""
    conversation_id: Optional[str] = Field(
        default=None,
        description="Existing conversation ID. Creates new if omitted."
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="User's message"
    )


class ToolCallResult(BaseModel):
    """Result of a tool execution."""
    tool: str
    arguments: dict
    result: dict


class ChatResponse(BaseModel):
    """Chat endpoint response."""
    conversation_id: str
    response: str
    tool_calls: list[ToolCallResult] = Field(default_factory=list)
```

---

## Main Endpoint Implementation

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from openai import OpenAI
import json

from app.database import get_session
from app.auth import get_current_user
from app.models import User, Conversation, Message
from app.tools import TASK_TOOLS, execute_tool
from app.config import OPENAI_API_KEY

router = APIRouter(prefix="/api", tags=["Chat"])
client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = """You are a helpful task management assistant. You help users manage their tasks using the available tools.

Available actions:
- add_task: Create a new task
- list_tasks: Show tasks (all, pending, or completed)
- complete_task: Mark a task as done
- delete_task: Remove a task
- update_task: Modify a task's title or description

Be concise and helpful. After using tools, summarize what you did."""


@router.post("/{user_id}/chat", response_model=ChatResponse)
async def chat(
    user_id: str,
    request: ChatRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> ChatResponse:
    """
    Process a chat message with AI agent.

    Stateless flow:
    1. Verify user authorization
    2. Get or create conversation
    3. Load message history from DB
    4. Call OpenAI with tools
    5. Execute any tool calls
    6. Store all messages
    7. Return response
    """

    # =========================================================================
    # 1. AUTHORIZATION - Verify user owns this conversation
    # =========================================================================
    if current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Not authorized to access this user's chat"
        )

    # =========================================================================
    # 2. GET OR CREATE CONVERSATION
    # =========================================================================
    conversation = await get_or_create_conversation(
        user_id=user_id,
        conversation_id=request.conversation_id,
        session=session
    )

    # =========================================================================
    # 3. LOAD MESSAGE HISTORY FROM DATABASE
    # =========================================================================
    messages = load_message_history(conversation.id, session)

    # Add system prompt if new conversation
    if not messages:
        messages.append({"role": "system", "content": SYSTEM_PROMPT})

    # Add user's new message
    messages.append({"role": "user", "content": request.message})

    # Store user message
    save_message(
        conversation_id=conversation.id,
        role="user",
        content=request.message,
        session=session
    )

    # =========================================================================
    # 4. CALL OPENAI API
    # =========================================================================
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TASK_TOOLS,
            tool_choice="auto"
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"AI service error: {str(e)}"
        )

    assistant_message = response.choices[0].message
    tool_call_results = []

    # =========================================================================
    # 5. EXECUTE TOOL CALLS (if any)
    # =========================================================================
    if assistant_message.tool_calls:
        # Store assistant message with tool calls
        save_message(
            conversation_id=conversation.id,
            role="assistant",
            content=assistant_message.content,
            tool_calls=json.dumps([
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                }
                for tc in assistant_message.tool_calls
            ]),
            session=session
        )

        # Add to messages for follow-up call
        messages.append({
            "role": "assistant",
            "content": assistant_message.content,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                }
                for tc in assistant_message.tool_calls
            ]
        })

        # Execute each tool call
        for tool_call in assistant_message.tool_calls:
            function_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            # Execute tool (user_id injected for isolation)
            result = await execute_tool(
                user_id=user_id,
                function_name=function_name,
                arguments=arguments,
                session=session
            )

            # Track for response
            tool_call_results.append(ToolCallResult(
                tool=function_name,
                arguments=arguments,
                result=result
            ))

            # Store tool result message
            save_message(
                conversation_id=conversation.id,
                role="tool",
                content=json.dumps(result),
                tool_call_id=tool_call.id,
                session=session
            )

            # Add to messages
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(result)
            })

        # =====================================================================
        # 6. GET FINAL RESPONSE (after tool execution)
        # =====================================================================
        try:
            final_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
            final_content = final_response.choices[0].message.content
        except Exception as e:
            final_content = "I completed the action but had trouble summarizing. Please check your tasks."

    else:
        # No tool calls - use direct response
        final_content = assistant_message.content

    # =========================================================================
    # 7. STORE FINAL ASSISTANT RESPONSE
    # =========================================================================
    save_message(
        conversation_id=conversation.id,
        role="assistant",
        content=final_content,
        session=session
    )

    # Update conversation timestamp
    conversation.updated_at = datetime.now(timezone.utc)
    session.add(conversation)
    session.commit()

    # =========================================================================
    # 8. RETURN RESPONSE
    # =========================================================================
    return ChatResponse(
        conversation_id=conversation.id,
        response=final_content,
        tool_calls=tool_call_results
    )
```

---

## Helper Functions

```python
async def get_or_create_conversation(
    user_id: str,
    conversation_id: Optional[str],
    session: Session
) -> Conversation:
    """Get existing conversation or create new one."""

    if conversation_id:
        # Fetch existing with user isolation
        conversation = session.exec(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id  # CRITICAL
            )
        ).first()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )

        return conversation

    # Create new conversation
    conversation = Conversation(user_id=user_id)
    session.add(conversation)
    session.commit()
    session.refresh(conversation)

    return conversation


def load_message_history(
    conversation_id: str,
    session: Session,
    limit: int = 50
) -> list[dict]:
    """
    Load message history from database.

    Args:
        conversation_id: Conversation to load
        session: Database session
        limit: Max messages to load (prevents token overflow)

    Returns:
        List of messages in OpenAI format
    """
    messages = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    ).all()

    # Reverse to chronological order
    messages = list(reversed(messages))

    return [msg.to_openai_format() for msg in messages]


def save_message(
    conversation_id: str,
    role: str,
    content: Optional[str],
    session: Session,
    tool_calls: Optional[str] = None,
    tool_call_id: Optional[str] = None
) -> Message:
    """Save a message to the database."""

    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        tool_calls=tool_calls,
        tool_call_id=tool_call_id
    )

    session.add(message)
    session.commit()
    session.refresh(message)

    return message
```

---

## JWT Authentication

```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from app.config import BETTER_AUTH_SECRET

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> User:
    """
    Verify JWT token and return current user.

    Raises:
        HTTPException 401: Invalid or expired token
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            BETTER_AUTH_SECRET,
            algorithms=["HS256"]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload"
        )

    user = session.exec(
        select(User).where(User.id == user_id)
    ).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user
```

---

## Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           POST /api/{user_id}/chat                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. JWT VERIFICATION                                                          │
│    - Extract token from Authorization header                                 │
│    - Decode and verify signature                                             │
│    - Check user_id matches token.sub                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. GET/CREATE CONVERSATION                                                   │
│    - If conversation_id provided: fetch with user isolation                  │
│    - Else: create new conversation for user                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. LOAD HISTORY FROM DATABASE                                                │
│    SELECT * FROM messages                                                    │
│    WHERE conversation_id = ?                                                 │
│    ORDER BY created_at                                                       │
│    LIMIT 50                                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. BUILD MESSAGES ARRAY                                                      │
│    [                                                                         │
│      {role: "system", content: "..."},     ← From constant                   │
│      {role: "user", content: "..."},       ← From DB                         │
│      {role: "assistant", content: "..."},  ← From DB                         │
│      {role: "user", content: "..."}        ← New message                     │
│    ]                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. CALL OPENAI API                                                           │
│    client.chat.completions.create(                                           │
│        model="gpt-4o-mini",                                                  │
│        messages=messages,                                                    │
│        tools=TASK_TOOLS                                                      │
│    )                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                          ┌───────────┴───────────┐
                          │                       │
                          ▼                       ▼
              ┌───────────────────┐   ┌───────────────────────┐
              │ Has tool_calls?   │   │ No tool_calls         │
              │ YES               │   │ Direct response       │
              └───────────────────┘   └───────────────────────┘
                          │                       │
                          ▼                       │
┌─────────────────────────────────────────┐       │
│ 6. EXECUTE TOOLS                        │       │
│    for tool_call in tool_calls:         │       │
│        result = execute_tool(           │       │
│            user_id=user_id,  ← INJECTED │       │
│            function_name=...,           │       │
│            arguments=...                │       │
│        )                                │       │
│        save tool result to DB           │       │
└─────────────────────────────────────────┘       │
                          │                       │
                          ▼                       │
┌─────────────────────────────────────────┐       │
│ 7. CALL OPENAI AGAIN                    │       │
│    (for natural language summary)       │       │
└─────────────────────────────────────────┘       │
                          │                       │
                          └───────────┬───────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 8. SAVE ASSISTANT RESPONSE TO DATABASE                                       │
│    INSERT INTO messages (conversation_id, role, content, ...)                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 9. RETURN RESPONSE                                                           │
│    {                                                                         │
│        "conversation_id": "...",                                             │
│        "response": "I've added 'Buy groceries' to your tasks!",              │
│        "tool_calls": [{"tool": "add_task", "result": {...}}]                 │
│    }                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

```python
from fastapi import HTTPException

# Standard error responses
ERRORS = {
    401: "Unauthorized - Invalid or missing token",
    403: "Forbidden - Not authorized for this resource",
    404: "Conversation not found",
    422: "Validation error - Check request format",
    502: "AI service unavailable",
    500: "Internal server error"
}

# In endpoint
try:
    response = client.chat.completions.create(...)
except openai.RateLimitError:
    raise HTTPException(status_code=429, detail="Rate limited, try again later")
except openai.APIError as e:
    raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

---

## Configuration

```python
# app/config.py
import os

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
MAX_CONVERSATION_MESSAGES: int = int(os.getenv("MAX_CONVERSATION_MESSAGES", "50"))

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required")
```

```env
# .env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
MAX_CONVERSATION_MESSAGES=50
```

---

## Testing

```python
import pytest
from httpx import AsyncClient

@pytest.fixture
def auth_headers(test_user_token):
    return {"Authorization": f"Bearer {test_user_token}"}

async def test_chat_creates_conversation(
    client: AsyncClient,
    auth_headers: dict,
    test_user_id: str
):
    """Test that chat creates new conversation when none provided."""
    response = await client.post(
        f"/api/{test_user_id}/chat",
        json={"message": "Hello"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "conversation_id" in data
    assert "response" in data

async def test_chat_continues_conversation(
    client: AsyncClient,
    auth_headers: dict,
    test_user_id: str
):
    """Test that providing conversation_id continues existing conversation."""
    # First message
    response1 = await client.post(
        f"/api/{test_user_id}/chat",
        json={"message": "Add task: Buy milk"},
        headers=auth_headers
    )
    conv_id = response1.json()["conversation_id"]

    # Second message in same conversation
    response2 = await client.post(
        f"/api/{test_user_id}/chat",
        json={
            "conversation_id": conv_id,
            "message": "Show my tasks"
        },
        headers=auth_headers
    )

    assert response2.json()["conversation_id"] == conv_id

async def test_chat_unauthorized_user(
    client: AsyncClient,
    auth_headers: dict
):
    """Test that users can't access other users' chats."""
    response = await client.post(
        "/api/other-user-id/chat",
        json={"message": "Hello"},
        headers=auth_headers
    )

    assert response.status_code == 403

async def test_chat_executes_tools(
    client: AsyncClient,
    auth_headers: dict,
    test_user_id: str
):
    """Test that chat executes tool calls."""
    response = await client.post(
        f"/api/{test_user_id}/chat",
        json={"message": "Add a task to buy groceries"},
        headers=auth_headers
    )

    data = response.json()
    assert len(data["tool_calls"]) > 0
    assert data["tool_calls"][0]["tool"] == "add_task"
    assert data["tool_calls"][0]["result"]["success"] == True
```

---

## File Structure

```
backend/app/
├── routers/
│   └── chat.py           # Chat endpoint
├── services/
│   └── chat_service.py   # Business logic
├── models.py             # Conversation, Message models
├── schemas.py            # ChatRequest, ChatResponse
├── auth.py               # JWT verification
└── tools/
    ├── definitions.py    # TASK_TOOLS
    ├── executor.py       # execute_tool
    └── handlers/         # Individual tool handlers
```

---

## Checklist

- [ ] JWT verification on all requests
- [ ] user_id from token matches path parameter
- [ ] Conversations filtered by user_id
- [ ] Messages ordered chronologically
- [ ] Token limit handling (max 50 messages)
- [ ] Tool results stored in database
- [ ] Error responses are user-friendly
- [ ] OpenAI API errors handled gracefully
