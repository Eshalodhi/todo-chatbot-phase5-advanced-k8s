# Security Specification

**Parent Spec**: [Phase III AI Chatbot](./spec.md)
**Created**: 2026-01-16
**Status**: Draft

## Overview

Security requirements for the AI chatbot integration, covering API key protection, user isolation, authentication, input validation, and secure communication.

## Security Principles

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimal access required for each operation
3. **User Isolation**: Users can only access their own data
4. **Fail Secure**: Errors default to denying access
5. **Audit Trail**: Log security-relevant events

## API Key Protection

### Cohere API Key

**Threat**: API key exposure leads to unauthorized usage and costs

**Requirements**:

| Requirement | Implementation |
|-------------|----------------|
| Store in environment variables | `COHERE_API_KEY` in `.env` |
| Never log API key | Mask in logs: `****` |
| Never send to frontend | Backend-only access |
| Rotate periodically | Manual process, documented |
| Different keys per environment | dev/staging/prod keys |

**Backend Implementation**:

```python
# backend/app/core/config.py

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    COHERE_API_KEY: str  # Required, no default

    class Config:
        env_file = ".env"
        extra = "ignore"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Validate API key format
        if not self.COHERE_API_KEY or len(self.COHERE_API_KEY) < 20:
            raise ValueError("Invalid COHERE_API_KEY")
```

**Logging Protection**:

```python
# backend/app/core/logging.py

import re
import logging

class APIKeyFilter(logging.Filter):
    """Filter to mask API keys in logs."""

    API_KEY_PATTERNS = [
        r'COHERE_API_KEY[=:]\s*[\w-]+',
        r'api[_-]?key[=:]\s*[\w-]+',
        r'bearer\s+[\w-]{20,}',
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        if hasattr(record, 'msg'):
            for pattern in self.API_KEY_PATTERNS:
                record.msg = re.sub(
                    pattern,
                    '[REDACTED]',
                    str(record.msg),
                    flags=re.IGNORECASE
                )
        return True
```

## User Isolation

### Database Level

**Threat**: Users accessing other users' data

**Requirements**:

| Requirement | Implementation |
|-------------|----------------|
| All queries filter by user_id | WHERE clause on every query |
| Foreign keys enforce ownership | conversations.user_id → users.id |
| No cross-user joins | Queries scoped to single user |

**Implementation Pattern**:

```python
# CORRECT: User-isolated query
async def get_user_conversations(db: AsyncSession, user_id: str):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)  # Always filter
        .order_by(Conversation.updated_at.desc())
    )
    return result.scalars().all()

# WRONG: No user isolation (security vulnerability!)
async def get_all_conversations(db: AsyncSession):
    result = await db.execute(select(Conversation))  # NO!
    return result.scalars().all()
```

### API Level

**Threat**: User A accessing User B's endpoint

**Requirements**:

```python
# backend/app/routers/chat.py

@router.post("/{user_id}/chat")
async def chat(
    user_id: str,
    request: ChatRequest,
    current_user_id: str = Depends(get_current_user_id)  # From JWT
):
    # Verify ownership
    if user_id != current_user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot access other user's chat"
        )
    # ... proceed
```

### Conversation Ownership

**Threat**: User accessing another user's conversation via ID

```python
async def verify_conversation_ownership(
    db: AsyncSession,
    conversation_id: UUID,
    user_id: str
) -> Conversation:
    """Get conversation only if owned by user."""

    conversation = await db.get(Conversation, conversation_id)

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if conversation.user_id != user_id:
        # Don't reveal existence to non-owner
        raise HTTPException(status_code=404, detail="Conversation not found")

    return conversation
```

## Authentication

### JWT Verification

**Threat**: Unauthorized access via forged/expired tokens

**Requirements**:

| Requirement | Implementation |
|-------------|----------------|
| Verify signature | Using JWT_SECRET |
| Check expiration | `exp` claim validation |
| Extract user_id | From `sub` claim |
| Validate claims | Required fields present |

**Implementation**:

```python
# backend/app/core/security.py

from jose import JWTError, jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    """Extract and verify user_id from JWT token."""

    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"]
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid token: missing user_id"
            )

        return user_id

    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
```

## Input Validation

### Message Validation

**Threats**: Injection attacks, DoS via large payloads

**Requirements**:

| Validation | Rule |
|------------|------|
| Max length | 4000 characters |
| Min length | 1 character (non-empty) |
| No null bytes | Strip `\x00` |
| UTF-8 encoding | Validate encoding |

```python
# backend/app/schemas/chat.py

from pydantic import BaseModel, Field, validator

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: Optional[UUID] = None

    @validator('message')
    def validate_message(cls, v):
        # Strip null bytes
        v = v.replace('\x00', '')

        # Ensure not just whitespace
        if not v.strip():
            raise ValueError('Message cannot be empty')

        return v.strip()
```

### SQL Injection Prevention

**Threat**: Malicious input in task operations

**Mitigation**: SQLModel/SQLAlchemy parameterized queries

```python
# CORRECT: Parameterized query (safe)
result = await db.execute(
    select(Task)
    .where(Task.title.ilike(f"%{identifier}%"))  # Parameterized
    .where(Task.user_id == user_id)
)

# WRONG: String concatenation (vulnerable!)
query = f"SELECT * FROM tasks WHERE title LIKE '%{identifier}%'"  # NO!
```

### XSS Prevention

**Threat**: Malicious scripts in chat messages

**Frontend Mitigation**:

```typescript
// frontend/components/chat/ChatMessage.tsx

import DOMPurify from 'dompurify';
import { marked } from 'marked';

function ChatMessage({ message }: ChatMessageProps) {
  // Sanitize HTML from markdown rendering
  const sanitizedContent = DOMPurify.sanitize(
    marked(message.content),
    {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'ul', 'ol', 'li', 'code', 'pre'],
      ALLOWED_ATTR: []
    }
  );

  return (
    <div
      className="message"
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
```

## Rate Limiting

### Endpoint Rate Limits

**Threat**: DoS attacks, API abuse

| Endpoint | Limit |
|----------|-------|
| `POST /api/{user_id}/chat` | 20/min, 200/hour per user |
| `GET /api/{user_id}/conversations` | 60/min per user |

**Implementation**:

```python
# backend/app/core/rate_limit.py

from fastapi import Request, HTTPException
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, requests_per_minute: int = 20):
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)

    async def check(self, user_id: str):
        now = time.time()
        minute_ago = now - 60

        # Clean old requests
        self.requests[user_id] = [
            t for t in self.requests[user_id] if t > minute_ago
        ]

        if len(self.requests[user_id]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=429,
                detail={
                    "code": "RATE_LIMITED",
                    "message": "Too many requests. Please wait.",
                    "retry_after": 60
                }
            )

        self.requests[user_id].append(now)
```

## Secure Communication

### HTTPS Enforcement

**Requirement**: All production traffic over HTTPS

```python
# backend/app/main.py

from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

if settings.ENVIRONMENT == "production":
    app.add_middleware(HTTPSRedirectMiddleware)
```

### CORS Configuration

```python
# backend/app/main.py

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),  # Whitelist
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

## Audit Logging

### Security Events to Log

| Event | Log Level | Data |
|-------|-----------|------|
| Successful login | INFO | user_id, timestamp |
| Failed login | WARNING | email, timestamp, reason |
| Chat message | INFO | user_id, conversation_id, timestamp |
| Tool execution | INFO | user_id, tool_name, success |
| Auth failure | WARNING | user_id (if known), endpoint, reason |
| Rate limit hit | WARNING | user_id, endpoint |

**Implementation**:

```python
# backend/app/core/audit.py

import logging
from datetime import datetime

audit_logger = logging.getLogger("audit")

def log_security_event(
    event_type: str,
    user_id: str | None,
    details: dict
):
    audit_logger.info(
        f"SECURITY_EVENT",
        extra={
            "event_type": event_type,
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            **details
        }
    )

# Usage
log_security_event(
    event_type="CHAT_MESSAGE",
    user_id=user_id,
    details={"conversation_id": str(conversation_id)}
)
```

## Error Handling

### Secure Error Messages

**Principle**: Don't leak internal details

```python
# CORRECT: Generic error message
except Exception as e:
    logger.error(f"Chat error: {e}")  # Log details
    raise HTTPException(
        status_code=500,
        detail="An error occurred processing your message"  # Generic
    )

# WRONG: Exposing internal details
except Exception as e:
    raise HTTPException(
        status_code=500,
        detail=str(e)  # Exposes internals!
    )
```

### Error Response Format

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Please sign in to continue",
    "retryable": false
  }
}
```

## Security Testing

### Automated Tests

```python
# tests/security/test_user_isolation.py

async def test_cannot_access_other_users_conversation():
    """User A cannot access User B's conversation."""
    # Setup
    user_a_token = await create_user_and_login("a@test.com")
    user_b_token = await create_user_and_login("b@test.com")

    # User B creates conversation
    response = await client.post(
        "/api/user_b/chat",
        headers={"Authorization": f"Bearer {user_b_token}"},
        json={"message": "Hello"}
    )
    conversation_id = response.json()["conversation_id"]

    # User A tries to access
    response = await client.post(
        "/api/user_a/chat",
        headers={"Authorization": f"Bearer {user_a_token}"},
        json={"message": "Hello", "conversation_id": conversation_id}
    )
    assert response.status_code == 404  # Not found, not 403

async def test_rate_limiting():
    """Rate limiting prevents abuse."""
    token = await create_user_and_login("test@test.com")

    # Make many requests
    for i in range(25):
        response = await client.post(
            "/api/user_id/chat",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": f"Message {i}"}
        )

    # Should be rate limited
    assert response.status_code == 429
```

### Manual Security Checklist

- [ ] API key not in any logs
- [ ] API key not accessible from frontend
- [ ] User A cannot see User B's conversations
- [ ] User A cannot see User B's tasks via chat
- [ ] Expired JWT is rejected
- [ ] Invalid JWT is rejected
- [ ] Empty message is rejected
- [ ] Very long message is rejected
- [ ] SQL injection in message fails safely
- [ ] XSS in message is sanitized
- [ ] Rate limiting activates correctly
- [ ] HTTPS enforced in production
- [ ] CORS only allows configured origins

## Acceptance Criteria

- [ ] Cohere API key stored in environment only
- [ ] API key never logged or sent to frontend
- [ ] All queries filter by user_id
- [ ] Conversation ownership verified before access
- [ ] JWT verified on every chat request
- [ ] Messages validated for length and content
- [ ] Rate limiting prevents abuse
- [ ] Error messages don't leak internals
- [ ] Security events are logged
- [ ] All security tests pass
