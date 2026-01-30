# Tasks: Phase III AI Chatbot Integration

**Input**: Design documents from `/specs/003-phase3-ai-chatbot/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Manual testing via curl/Postman and browser (no automated tests per spec)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/app/`
- **Frontend**: `frontend/app/`, `frontend/components/`, `frontend/lib/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [x] T001 Add cohere>=5.20.0 and tenacity>=8.2.0 to backend/requirements.txt
- [x] T002 [P] Add COHERE_API_KEY to backend/.env.example
- [x] T003 [P] Add COHERE_API_KEY configuration to backend/app/config.py
- [x] T004 Create backend/app/services/ directory structure
- [x] T005 Create backend/app/services/chat/__init__.py package file
- [x] T006 Create backend/app/services/chat/tools/__init__.py package file

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database models and base tool infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Database Models

- [x] T007 Add Conversation model to backend/app/models.py with user_id FK, title, timestamps
- [x] T008 Add Message model to backend/app/models.py with conversation_id FK, role, content, tool_calls, tool_call_id
- [x] T009 Add ChatRequest and ChatResponse schemas to backend/app/schemas.py
- [x] T010 Add ConversationDTO and MessageDTO schemas to backend/app/schemas.py
- [x] T011 Run database sync to create conversations and messages tables (auto-runs on app startup)

### Tool Infrastructure

- [x] T012 Create ToolResult dataclass in backend/app/services/chat/tools/base.py
- [x] T013 Create tool definitions (all 5 tools) in backend/app/services/chat/tools/definitions.py
- [x] T014 Create ToolExecutor class shell in backend/app/services/chat/tools/executor.py

### Cohere Client

- [x] T015 Create CohereClient wrapper class in backend/app/services/chat/cohere_client.py with chat method
- [x] T016 Add system preamble constant to backend/app/services/chat/cohere_client.py

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Add Task via Chat (Priority: P1)

**Goal**: User types "Add a task to buy groceries" and task is created

**Independent Test**: `curl -X POST /api/{user_id}/chat -d '{"message": "Add a task to buy milk"}' -H "Authorization: Bearer $TOKEN"` → verify task appears in database

### Implementation for User Story 1

- [x] T017 [US1] Implement add_task tool handler in backend/app/services/chat/tools/add_task.py with user isolation
- [x] T018 [US1] Register add_task handler in backend/app/services/chat/tools/executor.py
- [x] T019 [US1] Create ChatService class in backend/app/services/chat/service.py with process_message method (9-step flow)
- [x] T020 [US1] Implement get_or_create_conversation helper in backend/app/services/chat/service.py
- [x] T021 [US1] Implement load_history helper (max 20 messages) in backend/app/services/chat/service.py
- [x] T022 [US1] Implement store_message helper in backend/app/services/chat/service.py
- [x] T023 [US1] Create chat router in backend/app/routers/chat.py with POST /api/{user_id}/chat endpoint
- [x] T024 [US1] Add JWT verification dependency to chat router (reuse verify_jwt_token from auth)
- [x] T025 [US1] Add user_id validation (token matches URL parameter) to chat router
- [x] T026 [US1] Register chat router in backend/app/main.py

**Checkpoint**: User Story 1 complete - can add tasks via chat

---

## Phase 4: User Story 2 - List Tasks via Chat (Priority: P1)

**Goal**: User asks "What are my tasks?" and sees task list in chat

**Independent Test**: `curl -X POST /api/{user_id}/chat -d '{"message": "Show my tasks"}' -H "Authorization: Bearer $TOKEN"` → verify task list returned

### Implementation for User Story 2

- [x] T027 [P] [US2] Implement list_tasks tool handler in backend/app/services/chat/tools/list_tasks.py with status filter
- [x] T028 [US2] Register list_tasks handler in backend/app/services/chat/tools/executor.py

**Checkpoint**: User Story 2 complete - can list tasks via chat

---

## Phase 5: User Story 3 - Complete Task via Chat (Priority: P1)

**Goal**: User says "Mark groceries task as done" and task is completed

**Independent Test**: `curl -X POST /api/{user_id}/chat -d '{"message": "Complete the milk task"}' -H "Authorization: Bearer $TOKEN"` → verify task.is_completed = true

### Implementation for User Story 3

- [x] T029 [P] [US3] Implement complete_task tool handler in backend/app/services/chat/tools/complete_task.py with task identifier matching
- [x] T030 [US3] Register complete_task handler in backend/app/services/chat/tools/executor.py

**Checkpoint**: User Story 3 complete - can complete tasks via chat

---

## Phase 6: User Story 4 - Delete Task via Chat (Priority: P2)

**Goal**: User says "Delete the groceries task" and task is removed

**Independent Test**: `curl -X POST /api/{user_id}/chat -d '{"message": "Delete the milk task"}' -H "Authorization: Bearer $TOKEN"` → verify task deleted from database

### Implementation for User Story 4

- [x] T031 [P] [US4] Implement delete_task tool handler in backend/app/services/chat/tools/delete_task.py with task identifier matching
- [x] T032 [US4] Register delete_task handler in backend/app/services/chat/tools/executor.py

**Checkpoint**: User Story 4 complete - can delete tasks via chat

---

## Phase 7: User Story 5 - Update Task via Chat (Priority: P2)

**Goal**: User says "Change task to buy organic groceries" and task is updated

**Independent Test**: `curl -X POST /api/{user_id}/chat -d '{"message": "Update milk task to call mom"}' -H "Authorization: Bearer $TOKEN"` → verify task.title updated

### Implementation for User Story 5

- [x] T033 [P] [US5] Implement update_task tool handler in backend/app/services/chat/tools/update_task.py with task identifier matching
- [x] T034 [US5] Register update_task handler in backend/app/services/chat/tools/executor.py

**Checkpoint**: User Story 5 complete - all 5 MCP tools functional

---

## Phase 8: User Story 6 - Conversation History (Priority: P2)

**Goal**: User sees previous messages when returning to chat

**Independent Test**: Create conversation, refresh page, verify messages persist

### Implementation for User Story 6

- [x] T035 [US6] Add GET /api/{user_id}/conversations endpoint to backend/app/routers/chat.py
- [x] T036 [US6] Add GET /api/{user_id}/conversations/{id}/messages endpoint to backend/app/routers/chat.py
- [x] T037 [US6] Implement conversation list query with user isolation in chat router

**Checkpoint**: User Story 6 complete - conversation persistence working

---

## Phase 9: User Story 7 - Chat UI (Priority: P1 for MVP)

**Goal**: Responsive chat interface with message display, input, and tool result feedback

**Independent Test**: Open /dashboard/chat, send message, see response and task list update

### API Client

- [x] T038 [P] [US7] Create chat API client in frontend/lib/api.ts with sendMessage function (added to existing api.ts)
- [x] T039 [P] [US7] Add getConversations and getMessages functions to frontend/lib/api.ts

### Chat Components

- [x] T040 [P] [US7] Create ChatContainer component in frontend/components/features/chat/chat-container.tsx
- [x] T041 [P] [US7] Create MessageList component in frontend/components/features/chat/message-list.tsx
- [x] T042 [P] [US7] Create MessageItem component in frontend/components/features/chat/message-item.tsx with user/assistant styling
- [x] T043 [P] [US7] Create ChatInput component in frontend/components/features/chat/chat-input.tsx with Enter/Shift+Enter handling
- [x] T044 [P] [US7] Create TypingIndicator component in frontend/components/features/chat/typing-indicator.tsx

### Chat Page

- [x] T045 [US7] Create chat page in frontend/app/(dashboard)/chat/page.tsx with state management
- [x] T046 [US7] Add auto-scroll to latest message in chat page (in MessageList component)
- [x] T047 [US7] Add error handling with retry option in chat page (in ChatContainer)
- [x] T048 [US7] Add conversation selector/switcher to chat page (in ChatContainer)

### Navigation

- [x] T049 [US7] Add Chat link to sidebar in frontend/components/layout/sidebar.tsx
- [x] T050 [US7] Add route protection for /dashboard/chat (uses existing ProtectedRoute via dashboard layout)

**Checkpoint**: User Story 7 complete - full chat UI functional

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, error handling, and final validation

- [ ] T051 Test add task via chat: "Add a task to buy groceries" → verify in dashboard
- [ ] T052 Test list tasks via chat: "What are my tasks?" → verify all tasks shown
- [ ] T053 Test complete task via chat: "Mark groceries as done" → verify status change
- [ ] T054 Test delete task via chat: "Delete the groceries task" → verify removal
- [ ] T055 Test update task via chat: "Change task 1 to call mom" → verify title change
- [ ] T056 Test task sync: Create task in chat, verify appears in Phase II dashboard
- [ ] T057 Test user isolation: Verify User A cannot see User B's conversations
- [ ] T058 Test conversation persistence: Refresh page, verify messages remain
- [ ] T059 Test Phase II functionality: Verify REST API and dashboard still work
- [ ] T060 Test mobile responsiveness: Verify chat UI works on mobile viewport
- [x] T061 Add retry logic with exponential backoff for Cohere API calls in backend/app/services/chat/cohere_client.py (implemented with tenacity)
- [x] T062 Add logging for chat operations in backend/app/services/chat/service.py (implemented throughout)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-9)**: All depend on Foundational phase completion
  - US1-US3 (P1) should be completed first
  - US4-US5 (P2) can follow
  - US6 (P2) conversation history can be done in parallel with US4-US5
  - US7 (Chat UI) can start after US1 is complete for backend
- **Polish (Phase 10)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US1 (Add Task) | Foundational | - |
| US2 (List Tasks) | Foundational | US1 (different files) |
| US3 (Complete Task) | Foundational | US1, US2 (different files) |
| US4 (Delete Task) | Foundational | US1-US3 (different files) |
| US5 (Update Task) | Foundational | US1-US4 (different files) |
| US6 (History) | US1 (chat endpoint) | US4, US5 |
| US7 (Chat UI) | US1 (backend API) | US2-US6 |

### Within Each User Story

- Tool handler before executor registration
- Backend API before frontend integration
- Core implementation before error handling

### Parallel Opportunities

**Phase 2 (Foundational)**: Models can be created in parallel
```bash
# These can run together:
Task: T007 "Add Conversation model"
Task: T008 "Add Message model"
Task: T012 "Create ToolResult dataclass"
Task: T013 "Create tool definitions"
```

**Phase 3-7 (Tool Handlers)**: All tool handlers can be built in parallel
```bash
# These can run together:
Task: T017 "Implement add_task tool handler"
Task: T027 "Implement list_tasks tool handler"
Task: T029 "Implement complete_task tool handler"
Task: T031 "Implement delete_task tool handler"
Task: T033 "Implement update_task tool handler"
```

**Phase 9 (Chat UI Components)**: All components can be built in parallel
```bash
# These can run together:
Task: T040 "Create ChatContainer component"
Task: T041 "Create MessageList component"
Task: T042 "Create MessageItem component"
Task: T043 "Create ChatInput component"
Task: T044 "Create TypingIndicator component"
```

---

## Implementation Strategy

### MVP First (Phases 1-3 + 9 Partial)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T016)
3. Complete Phase 3: User Story 1 - Add Task (T017-T026)
4. Complete Partial Phase 9: Minimal Chat UI (T038, T040-T045, T049)
5. **STOP and VALIDATE**: Can add task via chat and see in dashboard

### Core Functionality (Add Phases 4-5)

1. Add Phase 4: User Story 2 - List Tasks (T027-T028)
2. Add Phase 5: User Story 3 - Complete Task (T029-T030)
3. **STOP and VALIDATE**: All P1 stories work

### Extended Functionality (Add Phases 6-8)

1. Add Phase 6: User Story 4 - Delete Task (T031-T032)
2. Add Phase 7: User Story 5 - Update Task (T033-T034)
3. Add Phase 8: User Story 6 - History (T035-T037)
4. Complete Phase 9: Full Chat UI (T046-T050)

### Final Polish (Phase 10)

1. Run all integration tests (T051-T060)
2. Add retry logic and logging (T061-T062)

---

## Task Summary

| Phase | Description | Task Count | Parallel Tasks |
|-------|-------------|------------|----------------|
| 1 | Setup | 6 | 2 |
| 2 | Foundational | 10 | 4 |
| 3 | US1 - Add Task | 10 | 0 |
| 4 | US2 - List Tasks | 2 | 1 |
| 5 | US3 - Complete Task | 2 | 1 |
| 6 | US4 - Delete Task | 2 | 1 |
| 7 | US5 - Update Task | 2 | 1 |
| 8 | US6 - History | 3 | 0 |
| 9 | US7 - Chat UI | 13 | 7 |
| 10 | Polish | 12 | 0 |
| **Total** | | **62** | **17** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All MCP tools must filter by user_id for security
- Follow 9-step stateless flow pattern in ChatService
