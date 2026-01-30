# Feature Specification: Backend API Implementation

**Feature Branch**: `002-backend-api-specs`
**Created**: 2026-01-05
**Status**: Draft
**Input**: User description: "Phase II Backend Implementation with FastAPI, SQLModel, Neon PostgreSQL, and JWT authentication for TaskFlow multi-user task management application"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticate and Access Tasks API (Priority: P1)

A registered user logs in via the Next.js frontend (Better Auth), receives a JWT token, and uses that token to access protected API endpoints. The backend validates the JWT using the shared BETTER_AUTH_SECRET and extracts the user_id for all subsequent operations.

**Why this priority**: Authentication gates ALL API functionality - no task operations are possible without valid JWT authentication. This is the foundation for user isolation and security.

**Independent Test**: Register user via frontend, login, capture JWT from session, call GET /api/{user_id}/tasks with Authorization header, verify 200 response with empty array for new user.

**Acceptance Scenarios**:

1. **Given** a valid JWT token in Authorization header, **When** calling any protected endpoint, **Then** request succeeds with 200/201 status
2. **Given** no Authorization header, **When** calling any protected endpoint, **Then** return 401 Unauthorized with error message
3. **Given** an expired JWT token, **When** calling any protected endpoint, **Then** return 401 Unauthorized with "Token expired" message
4. **Given** a malformed JWT token, **When** calling any protected endpoint, **Then** return 401 Unauthorized with "Invalid token" message
5. **Given** valid JWT for user_id=1, **When** calling /api/2/tasks (different user), **Then** return 403 Forbidden

---

### User Story 2 - View My Tasks (Priority: P1)

An authenticated user retrieves their personal task list. The API returns only tasks belonging to the authenticated user (user isolation), never exposing other users' data.

**Why this priority**: Core read functionality required before any write operations can be tested.

**Independent Test**: Create user, login, call GET /api/{user_id}/tasks, verify response structure with empty array, add tasks via POST, call GET again, verify tasks returned.

**Acceptance Scenarios**:

1. **Given** authenticated user with no tasks, **When** GET /api/{user_id}/tasks, **Then** return 200 with empty array `[]`
2. **Given** authenticated user with 3 tasks, **When** GET /api/{user_id}/tasks, **Then** return 200 with array of 3 task objects
3. **Given** user_id in URL doesn't match JWT user_id, **When** GET /api/{user_id}/tasks, **Then** return 403 Forbidden
4. **Given** authenticated user, **When** GET /api/{user_id}/tasks, **Then** response includes all task fields: id, title, description, is_completed, created_at, updated_at

---

### User Story 3 - Create a New Task (Priority: P1)

An authenticated user creates a new task with a title and optional description. The task is automatically associated with the authenticated user and marked as not completed.

**Why this priority**: Creating tasks is essential for any useful interaction with the system.

**Independent Test**: Login, POST /api/{user_id}/tasks with valid payload, verify 201 response with created task, GET /api/{user_id}/tasks to confirm task exists.

**Acceptance Scenarios**:

1. **Given** valid payload `{"title": "Buy groceries"}`, **When** POST /api/{user_id}/tasks, **Then** return 201 with created task including auto-generated id, is_completed=false, timestamps
2. **Given** valid payload with description `{"title": "Buy groceries", "description": "Milk, eggs, bread"}`, **When** POST /api/{user_id}/tasks, **Then** return 201 with description included
3. **Given** empty title `{"title": ""}`, **When** POST /api/{user_id}/tasks, **Then** return 422 Unprocessable Entity with validation error
4. **Given** missing title field `{}`, **When** POST /api/{user_id}/tasks, **Then** return 422 Unprocessable Entity with validation error
5. **Given** title exceeding 200 characters, **When** POST /api/{user_id}/tasks, **Then** return 422 Unprocessable Entity with validation error

---

### User Story 4 - Update an Existing Task (Priority: P1)

An authenticated user updates their own task's title, description, or completion status. Users cannot update tasks belonging to other users.

**Why this priority**: Updating tasks (especially toggling completion) is core functionality for task management.

**Independent Test**: Create task, PATCH /api/{user_id}/tasks/{task_id} with new title, verify 200 response with updated data, GET task to confirm persistence.

**Acceptance Scenarios**:

1. **Given** existing task, **When** PATCH with `{"title": "Updated title"}`, **Then** return 200 with updated task, other fields unchanged
2. **Given** existing task, **When** PATCH with `{"is_completed": true}`, **Then** return 200 with is_completed=true, updated_at changed
3. **Given** existing task, **When** PATCH with `{"title": "New", "description": "Desc", "is_completed": true}`, **Then** return 200 with all fields updated
4. **Given** task_id that doesn't exist, **When** PATCH, **Then** return 404 Not Found
5. **Given** task belonging to different user, **When** PATCH, **Then** return 403 Forbidden
6. **Given** empty title `{"title": ""}`, **When** PATCH, **Then** return 422 Unprocessable Entity

---

### User Story 5 - Delete a Task (Priority: P1)

An authenticated user deletes their own task permanently. Users cannot delete tasks belonging to other users.

**Why this priority**: Complete CRUD functionality requires delete capability.

**Independent Test**: Create task, verify exists with GET, DELETE /api/{user_id}/tasks/{task_id}, verify 204 response, GET to confirm task removed.

**Acceptance Scenarios**:

1. **Given** existing task owned by user, **When** DELETE /api/{user_id}/tasks/{task_id}, **Then** return 204 No Content
2. **Given** task_id that doesn't exist, **When** DELETE, **Then** return 404 Not Found
3. **Given** task belonging to different user, **When** DELETE, **Then** return 403 Forbidden
4. **Given** deleted task, **When** GET that task, **Then** return 404 Not Found

---

### User Story 6 - Get Single Task Details (Priority: P2)

An authenticated user retrieves details of a specific task they own.

**Why this priority**: Nice-to-have for viewing individual task details, but list endpoint covers most use cases.

**Independent Test**: Create task, GET /api/{user_id}/tasks/{task_id}, verify 200 response with complete task object.

**Acceptance Scenarios**:

1. **Given** existing task owned by user, **When** GET /api/{user_id}/tasks/{task_id}, **Then** return 200 with complete task object
2. **Given** task_id that doesn't exist, **When** GET, **Then** return 404 Not Found
3. **Given** task belonging to different user, **When** GET, **Then** return 403 Forbidden

---

### Edge Cases

- What happens when database connection fails? Return 503 Service Unavailable with retry guidance
- What happens when JWT secret mismatch between frontend and backend? Return 401 with "Invalid token signature"
- How does system handle concurrent updates to same task? Last write wins (no optimistic locking for MVP)
- What happens when user_id in URL is not a valid integer? Return 422 Unprocessable Entity
- What happens when request body is not valid JSON? Return 400 Bad Request
- What happens when task_id is not a valid integer? Return 422 Unprocessable Entity
- What happens when database times out? Return 503 with appropriate message

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST authenticate all requests using JWT tokens from Better Auth
- **FR-002**: System MUST validate JWT signature using shared BETTER_AUTH_SECRET environment variable
- **FR-003**: System MUST extract user_id from JWT claims for all operations
- **FR-004**: System MUST enforce user isolation - users can only access their own tasks
- **FR-005**: System MUST validate user_id in URL matches user_id from JWT token
- **FR-006**: System MUST persist tasks to Neon PostgreSQL via SQLModel ORM
- **FR-007**: System MUST auto-generate task IDs (integer, auto-increment)
- **FR-008**: System MUST auto-set created_at timestamp on task creation
- **FR-009**: System MUST auto-update updated_at timestamp on task modification
- **FR-010**: System MUST default is_completed to false on task creation
- **FR-011**: System MUST validate title is non-empty and max 200 characters
- **FR-012**: System MUST allow optional description field (nullable, no max length for MVP)
- **FR-013**: System MUST return appropriate HTTP status codes (200, 201, 204, 400, 401, 403, 404, 422, 500, 503)
- **FR-014**: System MUST return JSON error responses with "detail" field for all errors
- **FR-015**: System MUST support CORS for frontend origin (configurable via environment)
- **FR-016**: System MUST create database tables on startup if they don't exist

### Non-Functional Requirements

- **NFR-001**: API response time MUST be <500ms for 95th percentile under normal load
- **NFR-002**: System MUST handle at least 100 concurrent users
- **NFR-003**: System MUST use connection pooling for database connections
- **NFR-004**: System MUST log all requests with timestamps for debugging
- **NFR-005**: System MUST not expose internal error details in production (500 errors)
- **NFR-006**: System MUST provide OpenAPI documentation at /docs endpoint

### Key Entities

- **User**: Represents an authenticated user from Better Auth. Key attributes: id (from JWT sub claim), email (from JWT). Note: Users table is managed by Better Auth on frontend - backend only needs user_id from JWT for task ownership.

- **Task**: Represents a to-do item owned by a user. Key attributes:
  - id: Unique identifier (integer, auto-increment)
  - user_id: Owner identifier (string, from JWT, enforces ownership)
  - title: Task title (string, required, max 200 chars)
  - description: Task details (string, optional, nullable)
  - is_completed: Completion status (boolean, default false)
  - created_at: Creation timestamp (datetime, auto-set)
  - updated_at: Last modification timestamp (datetime, auto-update)

## API Specification

### Base URL
Production: `https://api.taskflow.example.com`
Development: `http://localhost:8000`

### Authentication
All endpoints require JWT Bearer token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Endpoints

| Method | Path | Description | Request Body | Success Response |
|--------|------|-------------|--------------|------------------|
| GET | /api/{user_id}/tasks | List all tasks for user | - | 200: Task[] |
| POST | /api/{user_id}/tasks | Create new task | CreateTaskDTO | 201: Task |
| GET | /api/{user_id}/tasks/{task_id} | Get single task | - | 200: Task |
| PATCH | /api/{user_id}/tasks/{task_id} | Update task | UpdateTaskDTO | 200: Task |
| DELETE | /api/{user_id}/tasks/{task_id} | Delete task | - | 204: No Content |

### Data Transfer Objects (DTOs)

**CreateTaskDTO** (Request):
```json
{
  "title": "string (required, 1-200 chars)",
  "description": "string | null (optional)"
}
```

**UpdateTaskDTO** (Request):
```json
{
  "title": "string | undefined (optional, 1-200 chars if provided)",
  "description": "string | null | undefined (optional)",
  "is_completed": "boolean | undefined (optional)"
}
```

**Task** (Response):
```json
{
  "id": 1,
  "user_id": "user_abc123",
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "is_completed": false,
  "created_at": "2026-01-05T10:30:00Z",
  "updated_at": "2026-01-05T10:30:00Z"
}
```

**ErrorResponse**:
```json
{
  "detail": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid JSON body |
| 401 | Unauthorized | Missing/invalid/expired JWT |
| 403 | Forbidden | User accessing another user's resources |
| 404 | Not Found | Task doesn't exist |
| 422 | Unprocessable Entity | Validation errors (empty title, invalid types) |
| 500 | Internal Server Error | Unexpected server errors |
| 503 | Service Unavailable | Database connection issues |

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | FastAPI | 0.115+ |
| ORM | SQLModel | 0.0.22+ |
| Database | Neon Serverless PostgreSQL | - |
| Auth | PyJWT (JWT validation) | 2.9+ |
| Validation | Pydantic (via SQLModel) | 2.x |
| ASGI Server | Uvicorn | 0.34+ |
| Python | Python | 3.11+ |

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| DATABASE_URL | Yes | Neon PostgreSQL connection string | postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require |
| BETTER_AUTH_SECRET | Yes | Shared JWT secret with frontend (32+ chars) | your-super-secret-key-32-chars-min |
| CORS_ORIGINS | Yes | Comma-separated allowed origins | http://localhost:3000,https://taskflow.vercel.app |
| ENVIRONMENT | No | Runtime environment (default: development) | development, production |

## Database Schema

### Tasks Table

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
```

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 5 API endpoints respond correctly per acceptance scenarios (100% pass rate on integration tests)
- **SC-002**: JWT authentication rejects invalid/expired tokens with correct status codes
- **SC-003**: User isolation prevents cross-user data access (403 returned for all cross-user attempts)
- **SC-004**: API response time <500ms for 95th percentile (measured with 50 concurrent requests)
- **SC-005**: Frontend integration successful - all CRUD operations work end-to-end with existing Next.js frontend
- **SC-006**: Database migrations run without errors on fresh Neon database
- **SC-007**: Zero unhandled exceptions visible to clients (proper error responses for all scenarios)
- **SC-008**: OpenAPI documentation accessible and accurate at /docs endpoint

### Definition of Done

- [ ] All 5 API endpoints implemented per specification
- [ ] JWT middleware validates tokens and extracts user_id correctly
- [ ] User isolation enforced on all endpoints (URL user_id must match JWT user_id)
- [ ] SQLModel Task model created with all required fields
- [ ] Database connection with Neon PostgreSQL established
- [ ] Tables created automatically on application startup
- [ ] CORS configured for frontend origin(s)
- [ ] Error handling returns proper status codes and JSON messages
- [ ] Integration tests pass for all acceptance scenarios
- [ ] API documentation generated via FastAPI /docs endpoint
- [ ] Environment variables documented with .env.example file
- [ ] README with setup and deployment instructions

## Integration Points

### Frontend Integration (Next.js + Better Auth)

The frontend at `frontend/lib/api.ts` will call these endpoints:
- JWT tokens are obtained from Better Auth session
- Token is attached as `Authorization: Bearer <token>` header
- User ID is extracted from session and used in URL paths

### Shared Configuration

Both frontend and backend MUST use the same:
- `BETTER_AUTH_SECRET` - for JWT signing/verification
- User ID format - string from Better Auth user.id

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| JWT secret mismatch | Auth fails completely | Document shared secret requirement, verify in integration tests |
| Neon cold start latency | First request slow | Use connection pooling, warm connections |
| CORS misconfiguration | Frontend cannot call API | Test CORS in development, document allowed origins |
