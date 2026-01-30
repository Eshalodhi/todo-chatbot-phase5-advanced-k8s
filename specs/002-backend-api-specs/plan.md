# Implementation Plan: Backend API

**Branch**: `002-backend-api-specs` | **Date**: 2026-01-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-backend-api-specs/spec.md`

## Summary

Implement a FastAPI backend for the TaskFlow multi-user task management application. The backend provides 5 REST API endpoints for task CRUD operations, with JWT-based authentication using a shared secret with the Better Auth frontend. All data is persisted to Neon PostgreSQL via SQLModel ORM, with strict user isolation ensuring users can only access their own tasks.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: FastAPI 0.115+, SQLModel 0.0.22+, PyJWT 2.9+, Uvicorn 0.34+, psycopg2-binary
**Storage**: Neon Serverless PostgreSQL (connection via DATABASE_URL)
**Testing**: pytest with httpx for async testing
**Target Platform**: Linux server (Render/Railway deployment)
**Project Type**: Web application (backend component of monorepo)
**Performance Goals**: <500ms p95 response time, 100 concurrent users
**Constraints**: User isolation mandatory, JWT verification on all endpoints, CORS for frontend
**Scale/Scope**: Single Tasks table, ~1000 tasks per user, 100+ users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| II. Security First - User Isolation | PASS | All queries filtered by user_id from JWT |
| II. Security First - JWT Verification | PASS | verify_jwt_token dependency on all routes |
| II. Security First - User ID Validation | PASS | URL user_id must match JWT sub claim |
| III. Code Quality - Type Hints | PASS | All functions have type annotations |
| III. Code Quality - Async Handlers | PASS | All endpoints use async def |
| III. Code Quality - Pydantic Validation | PASS | SQLModel provides Pydantic schemas |
| V. Data Integrity - Neon PostgreSQL | PASS | DATABASE_URL connects to Neon |
| V. Data Integrity - Indexes | PASS | idx_tasks_user_id created |
| V. Data Integrity - Timestamps | PASS | created_at, updated_at on Task model |
| Technology Standards - FastAPI | PASS | Using FastAPI as framework |
| Technology Standards - SQLModel | PASS | Using SQLModel as ORM |
| Technology Standards - python-jose | NEEDS UPDATE | Using PyJWT instead (simpler, same HS256 support) |
| API Contract - Endpoints | PASS | All 5 endpoints match constitution pattern |

**Gate Result**: PASS (1 minor deviation - PyJWT vs python-jose, both support HS256)

## Project Structure

### Documentation (this feature)

```text
specs/002-backend-api-specs/
├── plan.md              # This file
├── research.md          # Phase 0 output - best practices research
├── data-model.md        # Phase 1 output - SQLModel entity definitions
├── quickstart.md        # Phase 1 output - setup and run instructions
├── contracts/           # Phase 1 output - OpenAPI specification
│   └── tasks-api.yaml   # OpenAPI 3.0 schema
└── tasks.md             # Phase 2 output (created by /sp.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app, CORS, startup
│   ├── config.py            # Environment variables
│   ├── database.py          # Neon PostgreSQL connection
│   ├── models.py            # SQLModel Task model
│   ├── schemas.py           # Pydantic DTOs
│   ├── auth.py              # JWT verification dependency
│   └── routers/
│       ├── __init__.py
│       └── tasks.py         # Task CRUD endpoints
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Pytest fixtures
│   ├── test_auth.py         # JWT verification tests
│   └── test_tasks.py        # Endpoint integration tests
├── requirements.txt         # Python dependencies
├── .env.example             # Environment template
└── README.md                # Setup instructions
```

**Structure Decision**: Web application backend structure following FastAPI conventions. Uses `app/` package with routers for endpoint organization. Tests separated into auth and endpoint tests.

## Architecture Decisions

### Decision 1: Database Connection Strategy

**Selected**: SQLModel Session dependency injection

**Rationale**: Provides better testability (can inject mock sessions), follows FastAPI dependency injection pattern, and enables proper connection pooling per request.

**Alternatives Rejected**:
- Global connection pool: Simpler but harder to test and doesn't integrate with FastAPI's dependency system

**Implementation**:
```python
def get_session():
    with Session(engine) as session:
        yield session

@app.get("/api/{user_id}/tasks")
async def get_tasks(session: Session = Depends(get_session)):
    ...
```

### Decision 2: JWT Verification Approach

**Selected**: FastAPI Dependency per endpoint

**Rationale**: Explicit about which endpoints require auth, easier to understand and test, allows flexibility for future public endpoints.

**Alternatives Rejected**:
- Middleware for all routes: DRY but less explicit, harder to exclude specific routes

**Implementation**:
```python
async def verify_jwt_token(authorization: str = Header(...)) -> str:
    # Returns user_id from token
    ...

@app.get("/api/{user_id}/tasks")
async def get_tasks(
    user_id: str,
    token_user_id: str = Depends(verify_jwt_token)
):
    if user_id != token_user_id:
        raise HTTPException(403, "Forbidden")
```

### Decision 3: User ID Validation

**Selected**: Explicit validation per endpoint

**Rationale**: Clear security boundary visible in each handler, easy to audit, follows constitution's explicit requirements.

**Implementation**: Compare URL `user_id` with JWT `sub` claim at the start of each handler.

### Decision 4: Error Response Format

**Selected**: FastAPI default format (`{"detail": "message"}`)

**Rationale**: Standard FastAPI pattern, matches frontend expectations, consistent with HTTPException behavior.

### Decision 5: Database Schema Management

**Selected**: SQLModel.metadata.create_all() on startup

**Rationale**: Simple for hackathon MVP, no migration complexity, tables created automatically.

**Alternatives Rejected**:
- Alembic migrations: Production-ready but adds complexity for MVP scope

**Future Consideration**: Migrate to Alembic when schema changes become frequent.

## Phase Dependencies

```
Phase 1: Database Foundation
    └─> Phase 2: Authentication Layer
            └─> Phase 3: API Endpoints (can parallelize all 5)
                    └─> Phase 4: Integration & Testing
                            └─> Phase 5: Deployment
```

### Parallel Opportunities

After Phase 2 (auth dependency ready):
- All 5 endpoint implementations can proceed in parallel
- Each endpoint is independent (different route handlers)

### Critical Path

1. Database connection must work before any endpoint testing
2. JWT verification must work before any protected endpoint
3. Frontend integration requires all endpoints + CORS

## Risk Mitigation

| Risk | Impact | Mitigation | Fallback |
|------|--------|------------|----------|
| Neon connection issues | Blocks all development | Test connection in Phase 1 | Use local PostgreSQL |
| JWT verification complexity | Auth failures | Implement + test early (Phase 2) | Disable auth temporarily for endpoint testing |
| User isolation bugs | Security vulnerability | Explicit cross-user tests | Code review all queries |
| CORS issues | Frontend cannot call API | Test with frontend early | Allow all origins for debugging |
| PyJWT vs python-jose | Token incompatibility | Use same algorithm (HS256) | Switch to python-jose if needed |

## Testing Strategy

### Phase 1 Validation
- [ ] Database connection successful
- [ ] Task table created with correct schema
- [ ] Index on user_id verified
- [ ] Basic CRUD queries work

### Phase 2 Validation
- [ ] Valid JWT verified successfully
- [ ] Invalid JWT returns 401
- [ ] Expired JWT returns 401
- [ ] user_id extracted correctly from token

### Phase 3 Validation (per endpoint)
- [ ] Valid request returns expected response
- [ ] Invalid JWT returns 401
- [ ] User ID mismatch returns 403
- [ ] Validation errors return 422
- [ ] Not found returns 404

### Phase 4 Validation
- [ ] Frontend can authenticate
- [ ] All CRUD operations work end-to-end
- [ ] No CORS errors
- [ ] User A cannot access User B's data

## Success Criteria

### Implementation Complete
- All 5 endpoints working per spec
- JWT verification on all routes
- User isolation enforced
- Data persists in Neon PostgreSQL
- CORS configured for frontend
- Proper HTTP status codes

### Integration Complete
- Frontend performs all CRUD operations
- Cross-user access prevented
- No CORS errors in browser
- Error handling works end-to-end

### Code Quality
- Type hints on all functions
- async def for all handlers
- No Python errors
- Passes constitution check

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
