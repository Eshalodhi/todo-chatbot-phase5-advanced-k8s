# Backend Development Guidelines

**Project**: Phase II/III Todo Application with AI Chatbot
**Stack**: Python 3.11+, FastAPI, SQLModel, Neon PostgreSQL, Cohere API
**Updated**: 2026-01-16

---

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.100+ | Web framework |
| SQLModel | 0.0.8+ | ORM with Pydantic |
| Alembic | 1.12+ | Database migrations |
| Pydantic | 2.x | Data validation |
| python-jose | 3.3+ | JWT handling |
| httpx | 0.24+ | Async HTTP client |
| cohere-ai | 5.0+ | AI integration (Phase III) |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI application
│   ├── core/
│   │   ├── config.py           # Settings (Pydantic BaseSettings)
│   │   ├── security.py         # JWT utilities
│   │   └── rate_limit.py       # Rate limiting (Phase III)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py             # User model
│   │   ├── task.py             # Task model
│   │   ├── conversation.py     # Conversation model (Phase III)
│   │   └── message.py          # Message model (Phase III)
│   ├── schemas/
│   │   ├── task.py             # Task Pydantic schemas
│   │   ├── auth.py             # Auth schemas
│   │   └── chat.py             # Chat schemas (Phase III)
│   ├── routers/
│   │   ├── auth.py             # /auth/* endpoints
│   │   ├── tasks.py            # /api/{user_id}/tasks/* endpoints
│   │   └── chat.py             # /api/{user_id}/chat endpoint (Phase III)
│   ├── crud/
│   │   ├── task.py             # Task CRUD operations
│   │   ├── conversation.py     # Conversation CRUD (Phase III)
│   │   └── message.py          # Message CRUD (Phase III)
│   ├── services/
│   │   └── chat/               # Chat service (Phase III)
│   │       ├── __init__.py
│   │       ├── service.py      # Main chat service
│   │       ├── cohere_client.py # Cohere API client
│   │       └── tools/          # MCP tools
│   │           ├── __init__.py
│   │           ├── base.py     # Base tool class
│   │           ├── executor.py # Tool routing
│   │           ├── add_task.py
│   │           ├── list_tasks.py
│   │           ├── complete_task.py
│   │           ├── delete_task.py
│   │           └── update_task.py
│   └── db/
│       └── session.py          # Database connection
├── alembic/
│   └── versions/               # Migration files
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
└── requirements.txt
```

---

## Coding Standards

### Type Hints

All functions must have complete type hints:

```python
from typing import Optional, List
from uuid import UUID

async def get_user_tasks(
    db: AsyncSession,
    user_id: str,
    status: Optional[str] = None
) -> List[Task]:
    """Fetch tasks for a user with optional status filter."""
    ...
```

### Docstrings

Use Google-style docstrings:

```python
async def create_task(
    db: AsyncSession,
    user_id: str,
    title: str
) -> Task:
    """Create a new task for a user.

    Args:
        db: Database session
        user_id: Owner's user ID
        title: Task title

    Returns:
        Created Task object

    Raises:
        ValidationError: If title is empty
    """
    ...
```

### Async/Await

All I/O operations must be async:

```python
# CORRECT
async def fetch_data():
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        return response.json()

# WRONG
def fetch_data():
    response = requests.get(url)  # Blocking!
    return response.json()
```

---

## Database Patterns

### SQLModel Models

```python
# app/models/task.py

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel

class TaskBase(SQLModel):
    """Base fields for Task."""
    title: str = Field(min_length=1, max_length=500)
    completed: bool = Field(default=False)

class Task(TaskBase, table=True):
    """Task database model."""
    __tablename__ = "tasks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TaskCreate(TaskBase):
    """Schema for creating a task."""
    pass

class TaskUpdate(SQLModel):
    """Schema for updating a task."""
    title: Optional[str] = None
    completed: Optional[bool] = None
```

### User Isolation (CRITICAL)

**Every database query MUST filter by user_id:**

```python
# CORRECT
async def get_user_tasks(db: AsyncSession, user_id: str) -> List[Task]:
    result = await db.execute(
        select(Task).where(Task.user_id == user_id)
    )
    return result.scalars().all()

# WRONG - Security vulnerability!
async def get_all_tasks(db: AsyncSession) -> List[Task]:
    result = await db.execute(select(Task))
    return result.scalars().all()
```

### Async Session

```python
# app/db/session.py

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    echo=settings.DEBUG
)

async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
```

---

## API Endpoints

### Phase II Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login user |
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | Google OAuth callback |
| GET | `/api/{user_id}/tasks` | List user's tasks |
| POST | `/api/{user_id}/tasks` | Create task |
| PUT | `/api/{user_id}/tasks/{task_id}` | Update task |
| DELETE | `/api/{user_id}/tasks/{task_id}` | Delete task |

### Phase III Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/{user_id}/chat` | Send chat message |
| GET | `/api/{user_id}/conversations` | List conversations |
| GET | `/api/{user_id}/conversations/{id}/messages` | Get messages |

### Endpoint Pattern

```python
# app/routers/tasks.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import get_current_user_id
from app.db.session import get_session
from app.schemas.task import TaskCreate, TaskResponse
from app.crud.task import TaskCRUD

router = APIRouter(prefix="/api", tags=["tasks"])

@router.post(
    "/{user_id}/tasks",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_task(
    user_id: str,
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_session),
    current_user_id: str = Depends(get_current_user_id)
):
    """Create a new task."""
    # Verify authorization
    if user_id != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create tasks for other users"
        )

    return await TaskCRUD.create(db, user_id=user_id, **task_data.dict())
```

---

## Phase III: AI Chatbot

### Cohere Integration

```python
# app/services/chat/cohere_client.py

import cohere
from app.core.config import settings

class CohereClient:
    def __init__(self):
        self.client = cohere.Client(api_key=settings.COHERE_API_KEY)
        self.model = settings.COHERE_MODEL  # "command-r-plus"
        self.temperature = settings.COHERE_TEMPERATURE  # 0.3

    async def chat(
        self,
        message: str,
        chat_history: list,
        tools: list
    ) -> CohereResponse:
        """Send message to Cohere with tool definitions."""
        response = self.client.chat(
            model=self.model,
            message=message,
            chat_history=chat_history,
            tools=tools,
            temperature=self.temperature,
            preamble=SYSTEM_PROMPT
        )
        return response
```

### MCP Tools

5 tools for task management:

| Tool | Parameters | Description |
|------|------------|-------------|
| `add_task` | title | Create a new task |
| `list_tasks` | status (optional) | List tasks |
| `complete_task` | task_identifier | Mark task done |
| `delete_task` | task_identifier | Remove task |
| `update_task` | task_identifier, new_title | Update task |

### Tool Implementation Pattern

```python
# app/services/chat/tools/add_task.py

from app.services.chat.tools.base import BaseTool, ToolResult
from app.crud.task import TaskCRUD

class AddTaskTool(BaseTool):
    name = "add_task"
    description = "Create a new task for the user"

    def validate_params(self, **params) -> tuple[bool, str | None]:
        title = params.get("title", "").strip()
        if not title:
            return False, "Task title cannot be empty"
        return True, None

    async def execute(self, user_id: str, **params) -> ToolResult:
        title = params["title"]

        task = await TaskCRUD.create(
            self.db,
            user_id=user_id,
            title=title
        )

        return ToolResult(
            success=True,
            message=f"Task '{title}' created successfully",
            data={"id": str(task.id), "title": task.title}
        )
```

### 9-Step Stateless Flow

```python
# app/services/chat/service.py

async def process_message(
    self,
    user_id: str,
    message: str,
    conversation_id: Optional[UUID] = None
) -> ChatResponse:
    # Step 1-2: Parse request, verify auth (handled by router)

    # Step 3: Load or create conversation
    conversation = await self._get_or_create_conversation(user_id, conversation_id)

    # Step 4: Load chat history
    history = await self._load_chat_history(conversation.id)

    # Step 5: Persist user message
    await self._save_message(conversation.id, "user", message)

    # Step 6: Call Cohere API
    response = await self.cohere.chat(message, history, TOOL_DEFINITIONS)

    # Step 7: Execute tool calls
    tool_results = []
    for tool_call in response.tool_calls or []:
        result = await self.executor.execute(
            tool_call.name, user_id, tool_call.parameters
        )
        tool_results.append(result)

    # Step 8: Persist AI response
    await self._save_message(
        conversation.id, "assistant", response.text,
        tool_calls=tool_results
    )

    # Step 9: Return response
    return ChatResponse(
        response=response.text,
        conversation_id=conversation.id,
        tool_calls=tool_results
    )
```

---

## Security

### JWT Verification

```python
# app/core/security.py

from jose import JWTError, jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user_id(
    credentials = Depends(security)
) -> str:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=["HS256"]
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

### API Key Protection

```python
# NEVER log API keys
import logging

class APIKeyFilter(logging.Filter):
    def filter(self, record):
        record.msg = re.sub(
            r'(api[_-]?key|bearer)\s*[=:]\s*[\w-]+',
            '[REDACTED]',
            str(record.msg),
            flags=re.IGNORECASE
        )
        return True
```

### Rate Limiting

```python
# app/core/rate_limit.py

from fastapi import HTTPException

class RateLimiter:
    def __init__(self, requests_per_minute: int = 20):
        self.limit = requests_per_minute
        self.requests = defaultdict(list)

    async def check(self, user_id: str):
        # ... implementation
        if len(recent_requests) >= self.limit:
            raise HTTPException(status_code=429, detail="Rate limited")
```

---

## Error Handling

### Standard Error Response

```python
from fastapi import HTTPException

# Use consistent error format
raise HTTPException(
    status_code=400,
    detail={
        "code": "VALIDATION_ERROR",
        "message": "Task title cannot be empty",
        "field": "title"
    }
)
```

### Global Exception Handler

```python
# app/main.py

from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    # Log full error
    logger.error(f"Unhandled error: {exc}", exc_info=True)

    # Return generic message (don't leak internals)
    return JSONResponse(
        status_code=500,
        content={
            "code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred"
        }
    )
```

---

## Testing

### Unit Tests

```python
# tests/unit/test_tools.py

import pytest
from app.services.chat.tools.add_task import AddTaskTool

@pytest.mark.asyncio
async def test_add_task_validates_empty_title():
    tool = AddTaskTool(db=mock_db)
    is_valid, error = tool.validate_params(title="")
    assert is_valid is False
    assert "empty" in error.lower()
```

### Integration Tests

```python
# tests/integration/test_chat.py

@pytest.mark.asyncio
async def test_chat_creates_task(client, auth_token, user_id):
    response = await client.post(
        f"/api/{user_id}/chat",
        headers={"Authorization": f"Bearer {auth_token}"},
        json={"message": "Add a task to buy groceries"}
    )
    assert response.status_code == 200
    assert response.json()["tool_calls"][0]["tool"] == "add_task"
```

---

## Environment Variables

```bash
# .env

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Auth
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# CORS
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000

# Phase III - AI
COHERE_API_KEY=your-cohere-api-key
COHERE_MODEL=command-r-plus
COHERE_TEMPERATURE=0.3

# Environment
ENVIRONMENT=development
DEBUG=true
```

---

## Migrations

### Create Migration

```bash
alembic revision --autogenerate -m "Add conversation and message tables"
```

### Apply Migration

```bash
alembic upgrade head
```

### Migration Best Practices

1. Always test migrations on staging first
2. Migrations should be reversible (`downgrade`)
3. Never modify existing migrations, create new ones
4. Include indexes for frequently queried columns
