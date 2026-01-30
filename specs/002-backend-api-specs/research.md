# Research: Backend API Implementation

**Feature**: 002-backend-api-specs
**Date**: 2026-01-05
**Status**: Complete

## Research Summary

This document consolidates research findings for the FastAPI backend implementation, resolving all technical unknowns identified during planning.

---

## 1. FastAPI + SQLModel Best Practices

### Decision: Use SQLModel with Dependency Injection

**Rationale**: SQLModel combines SQLAlchemy's power with Pydantic's validation, providing a single model definition for both database and API schemas.

**Key Patterns**:

```python
# Model definition (serves as both DB model and response schema)
from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional

class TaskBase(SQLModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None

class Task(TaskBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    is_completed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Session dependency
from sqlmodel import Session, create_engine

engine = create_engine(DATABASE_URL)

def get_session():
    with Session(engine) as session:
        yield session
```

**Alternatives Considered**:
- Pure SQLAlchemy + separate Pydantic models: More boilerplate, duplicate definitions
- Raw SQL with psycopg2: No ORM benefits, manual query building

---

## 2. Neon PostgreSQL Connection

### Decision: Use psycopg2-binary with SSL required

**Rationale**: Neon requires SSL connections. psycopg2-binary is the most compatible driver for SQLModel/SQLAlchemy.

**Connection String Format**:
```
postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
```

**Implementation**:
```python
from sqlmodel import create_engine
import os

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=True)  # echo=True for debugging
```

**Connection Pooling**: SQLAlchemy handles pooling by default. For Neon serverless:
- Pool size: 5 (default is fine for MVP)
- Pool timeout: 30 seconds
- No need for external pooler like PgBouncer for this scale

**Alternatives Considered**:
- asyncpg: Fully async but less SQLModel integration
- Neon's serverless driver: JavaScript-focused, not Python

---

## 3. JWT Verification with PyJWT

### Decision: Use PyJWT with HS256 algorithm

**Rationale**: PyJWT is simpler than python-jose, supports the same HS256 algorithm used by Better Auth, and has fewer dependencies.

**Implementation**:
```python
import jwt
from fastapi import Header, HTTPException

BETTER_AUTH_SECRET = os.getenv("BETTER_AUTH_SECRET")

async def verify_jwt_token(authorization: str = Header(...)) -> str:
    """Extract and verify JWT, return user_id."""
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Invalid authorization header")

    token = authorization[7:]  # Remove "Bearer " prefix

    try:
        payload = jwt.decode(token, BETTER_AUTH_SECRET, algorithms=["HS256"])
        return payload["sub"]  # user_id is in 'sub' claim
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
```

**Better Auth JWT Structure** (from frontend):
```json
{
  "sub": "user_abc123",     // user_id
  "email": "user@example.com",
  "iat": 1704067200,        // issued at
  "exp": 1704153600         // expiration
}
```

**Alternatives Considered**:
- python-jose: More features but heavier, same HS256 support
- authlib: Full OAuth library, overkill for JWT validation only

---

## 4. CORS Configuration for Next.js

### Decision: Use FastAPI's CORSMiddleware with explicit origins

**Rationale**: Security best practice is to specify exact allowed origins rather than wildcards.

**Implementation**:
```python
from fastapi.middleware.cors import CORSMiddleware

origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

**Environment Configuration**:
- Development: `CORS_ORIGINS=http://localhost:3000`
- Production: `CORS_ORIGINS=https://taskflow.vercel.app`

**Headers Allowed**:
- `Authorization`: For JWT Bearer token
- `Content-Type`: For JSON request bodies

---

## 5. User Isolation Pattern

### Decision: Filter all queries by user_id, validate URL matches JWT

**Rationale**: Constitution requires both query filtering AND URL/JWT validation for defense in depth.

**Implementation Pattern**:
```python
@router.get("/api/{user_id}/tasks")
async def get_tasks(
    user_id: str,
    token_user_id: str = Depends(verify_jwt_token),
    session: Session = Depends(get_session)
) -> list[Task]:
    # Step 1: Validate user_id matches token
    if user_id != token_user_id:
        raise HTTPException(403, "Forbidden")

    # Step 2: Query with user_id filter
    statement = select(Task).where(Task.user_id == user_id)
    return session.exec(statement).all()
```

**Security Layers**:
1. JWT verification (401 if invalid)
2. URL/JWT user_id match (403 if mismatch)
3. Query filter (defense in depth)

---

## 6. Error Handling Strategy

### Decision: Use FastAPI HTTPException with detail messages

**Rationale**: Consistent with FastAPI patterns, provides structured JSON errors.

**Status Code Mapping**:

| Scenario | Status | Detail Message |
|----------|--------|----------------|
| No Authorization header | 401 | "Invalid authorization header" |
| Invalid JWT | 401 | "Invalid token" |
| Expired JWT | 401 | "Token expired" |
| URL user_id != JWT user_id | 403 | "Forbidden" |
| Task not found | 404 | "Task not found" |
| Validation error | 422 | (auto-generated by Pydantic) |
| Database error | 503 | "Service temporarily unavailable" |

**Global Exception Handler**:
```python
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    # Log the actual error
    logger.error(f"Unhandled exception: {exc}")
    # Return generic message in production
    if os.getenv("ENVIRONMENT") == "production":
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
    raise exc
```

---

## 7. Testing Strategy

### Decision: pytest + httpx TestClient for integration tests

**Rationale**: httpx TestClient supports async, works seamlessly with FastAPI.

**Test Structure**:
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_tasks_unauthorized():
    response = client.get("/api/user123/tasks")
    assert response.status_code == 401

def test_get_tasks_forbidden():
    # Token for user123, accessing user456
    response = client.get(
        "/api/user456/tasks",
        headers={"Authorization": f"Bearer {token_for_user123}"}
    )
    assert response.status_code == 403
```

**Test Categories**:
1. `test_auth.py`: JWT verification edge cases
2. `test_tasks.py`: Endpoint behavior + user isolation

---

## 8. Deployment Considerations

### Decision: Deploy to Render with Docker

**Rationale**: Render supports Python/Docker, free tier available, easy Neon integration.

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Environment Variables** (set in Render dashboard):
- `DATABASE_URL`: Neon connection string
- `BETTER_AUTH_SECRET`: Shared with frontend
- `CORS_ORIGINS`: Frontend URL(s)
- `ENVIRONMENT`: "production"

**Alternatives Considered**:
- Railway: Similar features, slightly different pricing
- Fly.io: Good but more complex setup for Python

---

## Resolved Unknowns Summary

| Unknown | Resolution |
|---------|------------|
| SQLModel patterns | Use Table=True models with Field validators |
| Neon connection | psycopg2-binary with sslmode=require |
| JWT library | PyJWT with HS256 algorithm |
| CORS setup | CORSMiddleware with explicit origins |
| User isolation | URL validation + query filtering |
| Error format | HTTPException with detail field |
| Testing approach | pytest + httpx TestClient |
| Deployment | Render with Docker |

---

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLModel Documentation](https://sqlmodel.tiangolo.com/)
- [PyJWT Documentation](https://pyjwt.readthedocs.io/)
- [Neon PostgreSQL Connection](https://neon.tech/docs/connect/connect-from-any-app)
- [Better Auth JWT Structure](https://www.better-auth.com/docs/concepts/session)
