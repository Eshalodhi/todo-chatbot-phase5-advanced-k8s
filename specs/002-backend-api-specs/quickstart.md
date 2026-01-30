# Quickstart: Backend API

**Feature**: 002-backend-api-specs
**Date**: 2026-01-05

## Prerequisites

- Python 3.11+
- Neon PostgreSQL account with database
- Shared `BETTER_AUTH_SECRET` from frontend

## Setup Steps

### 1. Create Backend Directory

```bash
mkdir -p backend/app/routers backend/tests
cd backend
```

### 2. Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies

Create `requirements.txt`:

```text
fastapi==0.115.6
sqlmodel==0.0.22
uvicorn[standard]==0.34.0
pyjwt==2.9.0
psycopg2-binary==2.9.10
python-dotenv==1.0.1
httpx==0.28.1
pytest==8.3.4
pytest-asyncio==0.25.2
```

Install:

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create `.env`:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
BETTER_AUTH_SECRET=your-shared-secret-with-frontend-32-chars-min
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

Create `.env.example` (committed to git):

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
BETTER_AUTH_SECRET=your-shared-secret-with-frontend
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

### 5. Create Application Files

#### backend/app/__init__.py
```python
# Empty file to make app a package
```

#### backend/app/config.py
```python
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
BETTER_AUTH_SECRET = os.getenv("BETTER_AUTH_SECRET")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
```

#### backend/app/database.py
```python
from sqlmodel import create_engine, SQLModel, Session
from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, echo=True)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
```

#### backend/app/models.py
```python
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class Task(SQLModel, table=True):
    __tablename__ = "tasks"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, nullable=False)
    title: str = Field(min_length=1, max_length=200, nullable=False)
    description: Optional[str] = Field(default=None)
    is_completed: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
```

#### backend/app/schemas.py
```python
from sqlmodel import SQLModel, Field
from typing import Optional

class CreateTaskDTO(SQLModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None

class UpdateTaskDTO(SQLModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    is_completed: Optional[bool] = None
```

#### backend/app/auth.py
```python
import jwt
from fastapi import Header, HTTPException
from app.config import BETTER_AUTH_SECRET

async def verify_jwt_token(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid authorization header")

    token = authorization[7:]

    try:
        payload = jwt.decode(token, BETTER_AUTH_SECRET, algorithms=["HS256"])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
```

#### backend/app/main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import CORS_ORIGINS
from app.database import create_db_and_tables
from app.routers import tasks

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(
    title="TaskFlow API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(tasks.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

#### backend/app/routers/__init__.py
```python
# Empty file
```

#### backend/app/routers/tasks.py
```python
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import Task
from app.schemas import CreateTaskDTO, UpdateTaskDTO
from app.auth import verify_jwt_token

router = APIRouter(prefix="/api", tags=["Tasks"])

def verify_user_access(user_id: str, token_user_id: str):
    if user_id != token_user_id:
        raise HTTPException(403, "Forbidden")

@router.get("/{user_id}/tasks", response_model=List[Task])
async def get_tasks(
    user_id: str,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session)
):
    verify_user_access(user_id, token_user_id)
    statement = select(Task).where(Task.user_id == user_id)
    return session.exec(statement).all()

@router.post("/{user_id}/tasks", response_model=Task, status_code=201)
async def create_task(
    user_id: str,
    data: CreateTaskDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session)
):
    verify_user_access(user_id, token_user_id)
    task = Task(user_id=user_id, **data.model_dump())
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.get("/{user_id}/tasks/{task_id}", response_model=Task)
async def get_task(
    user_id: str,
    task_id: int,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session)
):
    verify_user_access(user_id, token_user_id)
    task = session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(404, "Task not found")
    return task

@router.patch("/{user_id}/tasks/{task_id}", response_model=Task)
async def update_task(
    user_id: str,
    task_id: int,
    data: UpdateTaskDTO,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session)
):
    verify_user_access(user_id, token_user_id)
    task = session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(404, "Task not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)
    task.updated_at = datetime.utcnow()

    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.delete("/{user_id}/tasks/{task_id}", status_code=204)
async def delete_task(
    user_id: str,
    task_id: int,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session)
):
    verify_user_access(user_id, token_user_id)
    task = session.get(Task, task_id)
    if not task or task.user_id != user_id:
        raise HTTPException(404, "Task not found")

    session.delete(task)
    session.commit()
```

### 6. Run Development Server

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 7. Verify Setup

1. Open http://localhost:8000/docs - OpenAPI documentation
2. Open http://localhost:8000/health - Health check

## Validation Checklist

### Database Connection
- [ ] `uvicorn` starts without database errors
- [ ] Tables created in Neon dashboard
- [ ] `idx_tasks_user_id` index visible

### API Endpoints
- [ ] GET /api/{user_id}/tasks returns 401 without token
- [ ] POST /api/{user_id}/tasks creates task with valid token
- [ ] All 5 endpoints accessible in /docs

### CORS
- [ ] Frontend at localhost:3000 can make requests
- [ ] No CORS errors in browser console

### Security
- [ ] Invalid token returns 401
- [ ] User ID mismatch returns 403
- [ ] User A cannot access User B's tasks

## Common Issues

### Database Connection Failed
```
Check DATABASE_URL format:
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### JWT Verification Failed
```
Ensure BETTER_AUTH_SECRET matches frontend exactly
Check token format: "Bearer <token>"
```

### CORS Error
```
Verify CORS_ORIGINS includes frontend URL
Check for trailing slashes (http://localhost:3000 not http://localhost:3000/)
```

## Next Steps

1. Run `/sp.tasks` to generate implementation tasks
2. Implement tests in `backend/tests/`
3. Deploy to Render/Railway
