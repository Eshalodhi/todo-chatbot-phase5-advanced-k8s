# Chat Endpoint Specification

**Parent Spec**: [Phase III AI Chatbot](./spec.md)
**Created**: 2026-01-16
**Status**: Draft

## Overview

Stateless chat API endpoint that receives user messages, processes them through Cohere AI, executes any tool calls, and returns responses. The endpoint follows a 9-step stateless flow with database persistence.

## Endpoint Definition

### POST /api/{user_id}/chat

**Authentication**: Bearer JWT token required
**Content-Type**: application/json

### Request Schema

```json
{
  "message": "Add a task to buy groceries",
  "conversation_id": "uuid-optional"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Yes | User's message (1-4000 chars) |
| `conversation_id` | UUID | No | Existing conversation ID. If omitted, creates new conversation |

### Response Schema

```json
{
  "response": "I've created a task 'Buy groceries' for you.",
  "conversation_id": "550e8400-e29b-41d4-a716-446655440000",
  "tool_calls": [
    {
      "tool": "add_task",
      "parameters": {"title": "Buy groceries"},
      "result": {
        "success": true,
        "message": "Task created",
        "data": {"id": "...", "title": "Buy groceries"}
      }
    }
  ],
  "created_at": "2026-01-16T10:00:00Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `response` | string | AI's response text |
| `conversation_id` | UUID | Conversation ID (new or existing) |
| `tool_calls` | array | List of tools executed (may be empty) |
| `created_at` | ISO datetime | Timestamp of response |

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `INVALID_MESSAGE` | Message empty or exceeds 4000 chars |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 403 | `FORBIDDEN` | JWT user_id doesn't match path user_id |
| 404 | `CONVERSATION_NOT_FOUND` | Invalid conversation_id |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `AI_UNAVAILABLE` | Cohere API unavailable |

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid authentication token",
    "retryable": false
  }
}
```

## 9-Step Stateless Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Receive Request                                      │
│ - Parse JSON body                                            │
│ - Validate message field                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Authenticate & Authorize                            │
│ - Verify JWT token                                          │
│ - Extract user_id from token                                │
│ - Verify token user_id matches path user_id                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Load/Create Conversation                            │
│ - If conversation_id provided: load from DB                 │
│ - Verify conversation belongs to user                       │
│ - If not provided: create new conversation                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Load Chat History                                   │
│ - Query messages for conversation (limit last 20)           │
│ - Format messages for Cohere API                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Persist User Message                                │
│ - Create Message record (role="user")                       │
│ - Save to database before AI call                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Call Cohere API                                     │
│ - Send message + history + tools                            │
│ - Apply retry logic on failure                              │
│ - Handle rate limiting                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 7: Execute Tool Calls                                  │
│ - If response has tool_calls: execute each                  │
│ - Pass user_id to all tool handlers                         │
│ - Collect results                                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 8: Persist AI Response                                 │
│ - Create Message record (role="assistant")                  │
│ - Include tool_calls JSON if any                            │
│ - Update conversation updated_at                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Step 9: Return Response                                     │
│ - Format response JSON                                      │
│ - Include conversation_id                                   │
│ - Include tool execution results                            │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### Router Definition

```python
# backend/app/routers/chat.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import verify_jwt, get_current_user_id
from app.db.session import get_session
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import ChatService

router = APIRouter(prefix="/api", tags=["chat"])

@router.post(
    "/{user_id}/chat",
    response_model=ChatResponse,
    responses={
        400: {"description": "Invalid request"},
        401: {"description": "Unauthorized"},
        403: {"description": "Forbidden - user mismatch"},
        404: {"description": "Conversation not found"},
        429: {"description": "Rate limited"},
        503: {"description": "AI service unavailable"}
    }
)
async def chat(
    user_id: str,
    request: ChatRequest,
    db: AsyncSession = Depends(get_session),
    current_user_id: str = Depends(get_current_user_id)
):
    """Process a chat message and return AI response."""

    # Step 2: Verify user authorization
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Cannot access other user's chat"}
        )

    # Steps 3-9 handled by ChatService
    chat_service = ChatService(db)
    return await chat_service.process_message(
        user_id=user_id,
        message=request.message,
        conversation_id=request.conversation_id
    )
```

### Request/Response Schemas

```python
# backend/app/schemas/chat.py

from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, Field, validator
from uuid import UUID

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[UUID] = None

    @validator('message')
    def message_not_empty(cls, v):
        if not v.strip():
            raise ValueError('Message cannot be empty or whitespace')
        return v.strip()

class ToolCallResult(BaseModel):
    tool: str
    parameters: dict
    result: dict

class ChatResponse(BaseModel):
    response: str
    conversation_id: UUID
    tool_calls: List[ToolCallResult] = []
    created_at: datetime

class ChatError(BaseModel):
    code: str
    message: str
    retryable: bool = False
```

### Chat Service

```python
# backend/app/services/chat/service.py

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.conversation import Conversation, Message
from app.schemas.chat import ChatResponse, ToolCallResult
from .cohere_client import CohereClient
from .tools.executor import ToolExecutor

class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.cohere = CohereClient()
        self.executor = ToolExecutor()

    async def process_message(
        self,
        user_id: str,
        message: str,
        conversation_id: Optional[UUID] = None
    ) -> ChatResponse:
        """Process a chat message through the 9-step flow."""

        # Step 3: Load or create conversation
        conversation = await self._get_or_create_conversation(
            user_id, conversation_id
        )

        # Step 4: Load chat history
        history = await self._load_chat_history(conversation.id)

        # Step 5: Persist user message
        user_message = await self._save_message(
            conversation_id=conversation.id,
            role="user",
            content=message
        )

        # Step 6: Call Cohere API
        cohere_response = await self.cohere.chat(
            message=message,
            chat_history=history
        )

        # Step 7: Execute tool calls
        tool_results = []
        if cohere_response.tool_calls:
            for tool_call in cohere_response.tool_calls:
                result = await self.executor.execute(
                    tool_name=tool_call.name,
                    user_id=user_id,
                    parameters=tool_call.parameters
                )
                tool_results.append(ToolCallResult(
                    tool=tool_call.name,
                    parameters=tool_call.parameters,
                    result=result.dict()
                ))

        # Step 8: Persist AI response
        ai_message = await self._save_message(
            conversation_id=conversation.id,
            role="assistant",
            content=cohere_response.text,
            tool_calls=[r.dict() for r in tool_results] if tool_results else None
        )

        # Update conversation timestamp
        conversation.updated_at = datetime.utcnow()
        await self.db.commit()

        # Step 9: Return response
        return ChatResponse(
            response=cohere_response.text,
            conversation_id=conversation.id,
            tool_calls=tool_results,
            created_at=ai_message.created_at
        )

    async def _get_or_create_conversation(
        self,
        user_id: str,
        conversation_id: Optional[UUID]
    ) -> Conversation:
        """Get existing conversation or create new one."""

        if conversation_id:
            conversation = await self.db.get(Conversation, conversation_id)
            if not conversation:
                raise HTTPException(
                    status_code=404,
                    detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found"}
                )
            if conversation.user_id != user_id:
                raise HTTPException(
                    status_code=403,
                    detail={"code": "FORBIDDEN", "message": "Cannot access other user's conversation"}
                )
            return conversation

        # Create new conversation
        conversation = Conversation(
            id=uuid4(),
            user_id=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(conversation)
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation

    async def _load_chat_history(
        self,
        conversation_id: UUID,
        limit: int = 20
    ) -> list:
        """Load recent messages for Cohere context."""

        from sqlmodel import select

        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = result.scalars().all()

        # Reverse to chronological order and format for Cohere
        return self.cohere.format_history(reversed(messages))

    async def _save_message(
        self,
        conversation_id: UUID,
        role: str,
        content: str,
        tool_calls: Optional[list] = None
    ) -> Message:
        """Persist a message to the database."""

        message = Message(
            id=uuid4(),
            conversation_id=conversation_id,
            role=role,
            content=content,
            tool_calls=tool_calls,
            created_at=datetime.utcnow()
        )
        self.db.add(message)
        await self.db.commit()
        await self.db.refresh(message)
        return message
```

## Stateless Design Principles

### No Server-Side Session State

The endpoint must be completely stateless:

1. **No in-memory conversation state** - All state persisted to database
2. **No session cookies** - JWT provides identity
3. **Horizontally scalable** - Any instance can handle any request
4. **Idempotent reads** - Same conversation_id returns consistent history

### Database as State Store

```
Request 1: message="Add task" → DB stores → Response
Request 2: message="List tasks" → DB loads history → DB stores → Response
Request 3: message="Complete it" → DB loads history (context) → DB stores → Response
```

## Rate Limiting

### Configuration

```python
# Per-user rate limits
RATE_LIMITS = {
    "requests_per_minute": 20,
    "requests_per_hour": 200,
    "max_concurrent": 3
}
```

### Implementation

```python
from fastapi import Request
from fastapi.responses import JSONResponse
import redis

async def rate_limit_middleware(request: Request, call_next):
    user_id = request.path_params.get("user_id")
    if user_id:
        # Check rate limit in Redis
        key = f"rate_limit:{user_id}"
        # ... rate limit logic
```

## Testing Requirements

### Unit Tests

- [ ] Request validation (empty message, too long)
- [ ] JWT verification
- [ ] User ID mismatch rejection
- [ ] Conversation creation
- [ ] Conversation loading
- [ ] Message persistence
- [ ] Response formatting

### Integration Tests

- [ ] Full chat flow without tools
- [ ] Full chat flow with tool execution
- [ ] Conversation continuity across requests
- [ ] Error handling for Cohere failures
- [ ] Concurrent request handling
- [ ] Rate limiting behavior

### Security Tests

- [ ] Cannot access other user's conversation
- [ ] Cannot chat without valid JWT
- [ ] SQL injection in message prevented
- [ ] XSS in message sanitized

## OpenAPI Documentation

```yaml
paths:
  /api/{user_id}/chat:
    post:
      summary: Send a chat message
      description: Process a natural language message and return AI response with optional tool executions
      security:
        - bearerAuth: []
      parameters:
        - name: user_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ChatRequest'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ChatResponse'
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '429':
          description: Rate limited
```

## Acceptance Criteria

- [ ] Endpoint accepts POST with message and optional conversation_id
- [ ] JWT verification enforced
- [ ] User can only access their own conversations
- [ ] New conversations created when ID not provided
- [ ] Chat history loaded for context
- [ ] User messages persisted before AI call
- [ ] AI responses persisted after processing
- [ ] Tool calls executed and results included
- [ ] Error responses follow standard format
- [ ] Rate limiting prevents abuse
- [ ] OpenAPI docs generated correctly
