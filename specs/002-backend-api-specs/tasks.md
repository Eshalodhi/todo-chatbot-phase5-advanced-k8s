# Tasks: Backend API Implementation

**Input**: Design documents from `/specs/002-backend-api-specs/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tasks-api.yaml

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story reference (US1-US6)
- File paths relative to `backend/`

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create backend project structure and install dependencies

- [X] T001 Create backend directory structure: `backend/app/`, `backend/app/routers/`, `backend/tests/`
- [X] T002 Create Python virtual environment and `backend/requirements.txt` with FastAPI, SQLModel, PyJWT, Uvicorn, psycopg2-binary, python-dotenv
- [X] T003 [P] Create `backend/.env.example` with DATABASE_URL, BETTER_AUTH_SECRET, CORS_ORIGINS, ENVIRONMENT
- [X] T004 [P] Create `backend/app/__init__.py` (empty package file)
- [X] T005 [P] Create `backend/app/routers/__init__.py` (empty package file)
- [X] T006 [P] Create `backend/tests/__init__.py` (empty package file)

**Checkpoint**: `pip install -r requirements.txt` succeeds, directory structure created

---

## Phase 2: Foundation (Database & Core Infrastructure)

**Purpose**: Database connection and shared infrastructure - MUST complete before user stories

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create `backend/app/config.py` with environment variable loading (DATABASE_URL, BETTER_AUTH_SECRET, CORS_ORIGINS, ENVIRONMENT)
- [X] T008 Create `backend/app/database.py` with SQLModel engine, create_db_and_tables(), get_session() dependency
- [X] T009 Create `backend/app/models.py` with Task SQLModel entity (id, user_id, title, description, is_completed, created_at, updated_at)
- [X] T010 [P] Create `backend/app/schemas.py` with CreateTaskDTO and UpdateTaskDTO Pydantic models
- [X] T011 Create `backend/app/main.py` with FastAPI app, lifespan handler for table creation, CORS middleware, health endpoint
- [ ] T012 Verify database connection by running `uvicorn app.main:app` and checking /health endpoint

**Checkpoint**: Server starts, database tables created, /health returns 200

---

## Phase 3: User Story 1 - Authenticate and Access Tasks API (Priority: P1)

**Goal**: JWT verification for all protected endpoints

**Independent Test**: Send request without Authorization header → 401; Send request with valid JWT → 200

### Implementation for User Story 1

- [X] T013 [US1] Create `backend/app/auth.py` with verify_jwt_token() dependency that extracts Bearer token
- [X] T014 [US1] Implement JWT decoding with PyJWT using BETTER_AUTH_SECRET and HS256 algorithm in `backend/app/auth.py`
- [X] T015 [US1] Add error handling for missing token (401), invalid token (401), expired token (401) in `backend/app/auth.py`
- [X] T016 [US1] Extract user_id from JWT 'sub' claim and return it from verify_jwt_token() in `backend/app/auth.py`
- [X] T017 [US1] Create verify_user_access() helper function to compare URL user_id with token user_id (403 if mismatch) in `backend/app/auth.py`

**Checkpoint**: Auth dependency ready, rejects invalid tokens with 401, extracts user_id correctly

---

## Phase 4: User Story 2 - View My Tasks (Priority: P1)

**Goal**: GET /api/{user_id}/tasks returns user's tasks only

**Independent Test**: Login, GET /api/{user_id}/tasks → empty array; Create tasks, GET again → tasks returned

### Implementation for User Story 2

- [X] T018 [US2] Create `backend/app/routers/tasks.py` with APIRouter(prefix="/api", tags=["Tasks"])
- [X] T019 [US2] Implement GET /{user_id}/tasks endpoint in `backend/app/routers/tasks.py` with verify_jwt_token and get_session dependencies
- [X] T020 [US2] Add user access validation (verify_user_access) at start of GET handler in `backend/app/routers/tasks.py`
- [X] T021 [US2] Query tasks with `select(Task).where(Task.user_id == user_id)` in GET handler in `backend/app/routers/tasks.py`
- [X] T022 [US2] Register tasks router in `backend/app/main.py` with app.include_router(tasks.router)

**Checkpoint**: GET /api/{user_id}/tasks returns 200 with user's tasks (empty array for new user)

---

## Phase 5: User Story 3 - Create a New Task (Priority: P1)

**Goal**: POST /api/{user_id}/tasks creates task and returns 201

**Independent Test**: POST with valid payload → 201 with created task; POST with empty title → 422

### Implementation for User Story 3

- [X] T023 [US3] Implement POST /{user_id}/tasks endpoint in `backend/app/routers/tasks.py` with CreateTaskDTO body
- [X] T024 [US3] Add user access validation at start of POST handler in `backend/app/routers/tasks.py`
- [X] T025 [US3] Create Task with user_id from URL, title/description from DTO, defaults for is_completed/timestamps in `backend/app/routers/tasks.py`
- [X] T026 [US3] Add task to session, commit, refresh, and return with status_code=201 in `backend/app/routers/tasks.py`
- [X] T027 [US3] Verify Pydantic validation rejects empty title and title >200 chars (automatic via CreateTaskDTO)

**Checkpoint**: POST creates task, returns 201, validation errors return 422

---

## Phase 6: User Story 4 - Update an Existing Task (Priority: P1)

**Goal**: PATCH /api/{user_id}/tasks/{task_id} updates task fields

**Independent Test**: Create task, PATCH with new title → 200 with updated task; PATCH non-existent → 404

### Implementation for User Story 4

- [X] T028 [US4] Implement PATCH /{user_id}/tasks/{task_id} endpoint in `backend/app/routers/tasks.py` with UpdateTaskDTO body
- [X] T029 [US4] Add user access validation at start of PATCH handler in `backend/app/routers/tasks.py`
- [X] T030 [US4] Fetch task by id, verify exists and belongs to user (404 if not found or wrong user) in `backend/app/routers/tasks.py`
- [X] T031 [US4] Apply partial update using model_dump(exclude_unset=True) for non-None fields in `backend/app/routers/tasks.py`
- [X] T032 [US4] Update updated_at timestamp to datetime.utcnow() on any change in `backend/app/routers/tasks.py`
- [X] T033 [US4] Commit, refresh, and return updated task in `backend/app/routers/tasks.py`

**Checkpoint**: PATCH updates task, returns 200, not found returns 404, wrong user returns 403

---

## Phase 7: User Story 5 - Delete a Task (Priority: P1)

**Goal**: DELETE /api/{user_id}/tasks/{task_id} removes task permanently

**Independent Test**: Create task, DELETE → 204; GET deleted task → 404

### Implementation for User Story 5

- [X] T034 [US5] Implement DELETE /{user_id}/tasks/{task_id} endpoint in `backend/app/routers/tasks.py`
- [X] T035 [US5] Add user access validation at start of DELETE handler in `backend/app/routers/tasks.py`
- [X] T036 [US5] Fetch task by id, verify exists and belongs to user (404 if not found or wrong user) in `backend/app/routers/tasks.py`
- [X] T037 [US5] Delete task from session, commit, return status_code=204 in `backend/app/routers/tasks.py`

**Checkpoint**: DELETE removes task, returns 204, not found returns 404

---

## Phase 8: User Story 6 - Get Single Task Details (Priority: P2)

**Goal**: GET /api/{user_id}/tasks/{task_id} returns individual task

**Independent Test**: Create task, GET by id → 200 with task; GET non-existent → 404

### Implementation for User Story 6

- [X] T038 [US6] Implement GET /{user_id}/tasks/{task_id} endpoint in `backend/app/routers/tasks.py`
- [X] T039 [US6] Add user access validation at start of GET single handler in `backend/app/routers/tasks.py`
- [X] T040 [US6] Fetch task by id using session.get(Task, task_id) in `backend/app/routers/tasks.py`
- [X] T041 [US6] Verify task exists and belongs to user (404 if not found or wrong user) in `backend/app/routers/tasks.py`
- [X] T042 [US6] Return task object in `backend/app/routers/tasks.py`

**Checkpoint**: GET single task returns 200, not found returns 404

---

## Phase 9: Integration & Polish

**Purpose**: Frontend integration, documentation, and final validation

### Integration

- [X] T043 Verify CORS configuration allows frontend origin in `backend/app/main.py`
- [ ] T044 Test all endpoints with frontend API client (if available)
- [ ] T045 Verify user isolation: User A cannot access User B's tasks (403 for all attempts)

### Documentation

- [X] T046 [P] Create `backend/README.md` with setup instructions, environment variables, and API overview
- [ ] T047 [P] Verify OpenAPI documentation at /docs endpoint is accurate and complete

### Deployment Preparation

- [X] T048 [P] Create `backend/Dockerfile` for containerized deployment
- [X] T049 [P] Create `backend/.gitignore` with venv/, __pycache__/, .env, *.pyc
- [ ] T050 Verify application starts in production mode with ENVIRONMENT=production

**Checkpoint**: All endpoints working, frontend integration successful, ready for deployment

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    └─> Phase 2: Foundation (database, models, app)
            └─> Phase 3: US1 Authentication (GATES all endpoints)
                    ├─> Phase 4: US2 View Tasks
                    ├─> Phase 5: US3 Create Task
                    ├─> Phase 6: US4 Update Task
                    ├─> Phase 7: US5 Delete Task
                    └─> Phase 8: US6 Get Single Task
                            └─> Phase 9: Integration & Polish
```

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US1 (Auth) | Phase 2 | - |
| US2 (View) | US1 | US3, US4, US5, US6 |
| US3 (Create) | US1 | US2, US4, US5, US6 |
| US4 (Update) | US1 | US2, US3, US5, US6 |
| US5 (Delete) | US1 | US2, US3, US4, US6 |
| US6 (Get One) | US1 | US2, US3, US4, US5 |

### Parallel Opportunities

**Setup (Phase 1)**:
```
T003, T004, T005, T006 can run in parallel (different files)
```

**Foundation (Phase 2)**:
```
T010 can run parallel with T007-T009 (different file)
```

**After US1 Complete (Phase 3)**:
```
ALL endpoint implementations (US2-US6) can run in parallel
Each endpoint is in the same file but different functions
```

**Polish (Phase 9)**:
```
T046, T047, T048, T049 can run in parallel (different files)
```

---

## Implementation Strategy

### MVP First (Core CRUD)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation
3. Complete Phase 3: US1 Authentication
4. Complete Phase 4: US2 View Tasks
5. Complete Phase 5: US3 Create Task
6. **STOP and VALIDATE**: Can view and create tasks
7. Complete remaining stories (US4, US5, US6)

### Minimum Viable Path

| Milestone | Stories Complete | Features |
|-----------|-----------------|----------|
| M1: Foundation | Setup + Phase 2 | Server starts, DB connected |
| M2: Auth | US1 | JWT verification working |
| M3: Read + Create | US1, US2, US3 | View tasks, create tasks (MVP!) |
| M4: Full CRUD | US1-US5 | + Update, Delete |
| M5: Complete | US1-US6 | + Get single task |
| M6: Polish | All + Phase 9 | Documentation, deployment ready |

---

## Notes

- [P] tasks can run in parallel (different files, no dependencies)
- [USn] label maps task to specific user story
- All endpoints go in same file (tasks.py) but are independent functions
- Authentication (US1) MUST complete before any endpoint (US2-US6)
- Commit after each task or logical group
- Stop at any checkpoint to validate progress
- Test user isolation at every opportunity (critical security requirement)
