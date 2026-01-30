# Implementation Plan: Phase III AI Chatbot Integration

**Branch**: `003-phase3-ai-chatbot` | **Date**: 2026-01-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-phase3-ai-chatbot/spec.md`

## Summary

Integrate an AI-powered chatbot into the existing Phase II todo application, enabling users to manage tasks through natural language conversation. The implementation uses Cohere API v2 with `command-r-plus` model, 5 MCP tools (add_task, list_tasks, complete_task, delete_task, update_task), and a stateless architecture where conversation history is persisted in PostgreSQL and reconstructed for each request.

## Technical Context

**Language/Version**: Python 3.11, TypeScript 5.x (strict mode)
**Primary Dependencies**: FastAPI, SQLModel, cohere>=5.20.0, tenacity, Next.js 16+, Tailwind CSS
**Storage**: Neon PostgreSQL (serverless) - existing Phase II database
**Testing**: Manual API testing (curl/Postman), browser testing
**Target Platform**: Web (desktop and mobile responsive)
**Project Type**: Web application (frontend + backend monorepo)
**Performance Goals**: Chat response < 5 seconds (95th percentile)
**Constraints**: Cohere API rate limits, 20 message history limit, user isolation required
**Scale/Scope**: Single-tenant, existing user base from Phase II

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Spec-Driven Development** | PASS | spec.md complete, plan.md in progress |
| **II. Security First** | PASS | User isolation via user_id filter, JWT verification, API key in env vars |
| **III. Code Quality** | PASS | Type hints required, async/await for I/O, Pydantic validation |
| **IV. User Experience** | PASS | Typing indicator, error messages, auto-scroll, mobile responsive |
| **V. Data Integrity** | PASS | Foreign keys, indexes, cascade delete defined in data-model.md |
| **VI. Stateless Architecture** | PASS | 9-step flow defined, no server-side session storage |
| **VII. AI Integration** | PASS | Cohere v2 API, tool definitions, preamble documented |
| **VIII. MCP Tools Specification** | PASS | All 5 tools defined in contracts/mcp-tools.md |
| **IX. Chat UI Requirements** | PASS | Message display, input, scrolling requirements specified |

**Non-Negotiable Rules Check**:
- JWT Verification: verify_jwt_token dependency (reuse Phase II)
- User ID Match: verify_user_access function (reuse Phase II)
- Query Filtering: All queries include WHERE user_id = X
- API Key Security: COHERE_API_KEY in environment variables only
- Tool Consistency: Consistent ToolResult format for all 5 tools
- History Limit: 20 messages max loaded per request
- Async I/O: All Cohere API calls use async/await

## Project Structure

### Documentation (this feature)

```text
specs/003-phase3-ai-chatbot/
├── spec.md              # Feature specification (input)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 output: Cohere API research
├── data-model.md        # Phase 1 output: Database schema
├── quickstart.md        # Phase 1 output: Development setup
├── contracts/           # Phase 1 output: API contracts
│   ├── chat-api.yaml    # OpenAPI specification
│   └── mcp-tools.md     # MCP tool definitions
└── tasks.md             # Phase 2 output: Task breakdown (TBD)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── main.py                 # Updated: Add chat router
│   ├── models.py               # Updated: Add Conversation, Message
│   ├── schemas.py              # Updated: Add chat DTOs
│   ├── config.py               # Updated: Add COHERE_API_KEY
│   ├── auth.py                 # Unchanged: Reuse JWT verification
│   ├── database.py             # Unchanged: Reuse session management
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py             # Unchanged
│   │   ├── tasks.py            # Unchanged
│   │   └── chat.py             # NEW: Chat endpoint
│   └── services/
│       └── chat/               # NEW: Chat service package
│           ├── __init__.py
│           ├── service.py      # Main chat orchestration (9-step flow)
│           ├── cohere_client.py # Cohere API wrapper with tools
│           └── tools/          # MCP tool implementations
│               ├── __init__.py
│               ├── base.py     # ToolResult dataclass
│               ├── definitions.py # Tool schema definitions
│               ├── executor.py # Tool routing
│               ├── add_task.py
│               ├── list_tasks.py
│               ├── complete_task.py
│               ├── delete_task.py
│               └── update_task.py
└── requirements.txt            # Updated: Add cohere, tenacity

frontend/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx  # Unchanged
│   │   ├── chat/page.tsx       # NEW: Chat page
│   │   └── layout.tsx          # Updated: Add chat nav link
│   └── layout.tsx              # Unchanged
├── components/
│   ├── features/
│   │   ├── task-list.tsx       # Unchanged
│   │   └── chat/               # NEW: Chat components
│   │       ├── chat-container.tsx
│   │       ├── message-list.tsx
│   │       ├── message-item.tsx
│   │       ├── chat-input.tsx
│   │       └── typing-indicator.tsx
│   └── layout/
│       └── sidebar.tsx         # Updated: Add Chat link
└── lib/
    └── api/
        └── chat.ts             # NEW: Chat API client
```

**Structure Decision**: Web application structure selected (Option 2) based on existing Phase II monorepo layout with frontend/ and backend/ directories.

## Complexity Tracking

> No violations requiring justification. All implementations follow constitution guidelines.

| Consideration | Decision | Rationale |
|--------------|----------|-----------|
| Tool execution | Synchronous | Simpler than parallel; CRUD operations are fast |
| Message history | 20 messages | Balances context vs. token costs |
| Conversation storage | Multiple per user | Flexibility per Phase III spec |
| Error to AI | Yes | Let Cohere explain errors naturally |

## Implementation Phases

### Phase 1: Database Foundation

**Goal**: Create Conversation and Message models with proper relationships.

**Files to Create/Modify**:
- `backend/app/models.py` - Add Conversation, Message classes
- `backend/app/schemas.py` - Add ChatRequest, ChatResponse, MessageDTO

**Acceptance Criteria**:
- [ ] Conversation model created with user_id FK, indexes
- [ ] Message model created with conversation_id FK, role enum, indexes
- [ ] Cascade delete configured (conversation → messages)
- [ ] Models sync to database successfully
- [ ] Can insert/query conversations and messages

**Key Code Pattern**:
```python
# models.py
class Conversation(SQLModel, table=True):
    __tablename__ = "conversations"
    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, foreign_key="users.id")
    title: str | None = Field(default=None, max_length=200)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
```

---

### Phase 2: MCP Tools Implementation

**Goal**: Implement 5 MCP tools with database operations and user isolation.

**Files to Create**:
- `backend/app/services/chat/__init__.py`
- `backend/app/services/chat/tools/__init__.py`
- `backend/app/services/chat/tools/base.py` - ToolResult dataclass
- `backend/app/services/chat/tools/definitions.py` - Cohere tool schemas
- `backend/app/services/chat/tools/executor.py` - Tool routing
- `backend/app/services/chat/tools/add_task.py`
- `backend/app/services/chat/tools/list_tasks.py`
- `backend/app/services/chat/tools/complete_task.py`
- `backend/app/services/chat/tools/delete_task.py`
- `backend/app/services/chat/tools/update_task.py`

**Acceptance Criteria**:
- [ ] add_task creates task in database, returns ToolResult
- [ ] list_tasks retrieves tasks with optional status filter
- [ ] complete_task marks task as done, handles not found
- [ ] delete_task removes task, handles not found
- [ ] update_task modifies title/description, handles not found
- [ ] All tools filter by user_id (user isolation verified)
- [ ] All tools return consistent ToolResult format
- [ ] Tool executor routes calls to correct handlers
- [ ] Error handling for validation and database errors

**Key Code Pattern**:
```python
# tools/base.py
@dataclass
class ToolResult:
    success: bool
    message: str
    data: dict | None = None

# tools/executor.py
class ToolExecutor:
    async def execute(self, tool_name: str, user_id: str, params: dict) -> ToolResult:
        handler = self.handlers.get(tool_name)
        return await handler(user_id=user_id, **params)
```

---

### Phase 3: Cohere API Integration

**Goal**: Build chat endpoint implementing 9-step stateless flow.

**Files to Create/Modify**:
- `backend/app/config.py` - Add COHERE_API_KEY, COHERE_MODEL
- `backend/app/services/chat/cohere_client.py` - Cohere API wrapper
- `backend/app/services/chat/service.py` - Chat orchestration
- `backend/app/routers/chat.py` - POST /api/{user_id}/chat
- `backend/app/main.py` - Register chat router
- `backend/requirements.txt` - Add cohere>=5.20.0

**Acceptance Criteria**:
- [ ] Cohere SDK installed and configured
- [ ] API key loaded from environment variable (CO_API_KEY)
- [ ] Chat endpoint POST /api/{user_id}/chat created
- [ ] JWT verification working (reuse verify_jwt_token)
- [ ] User_id validation (token matches URL parameter)
- [ ] Conversation history loaded from database (max 20)
- [ ] New user message stored before Cohere call
- [ ] Cohere API called with tools and chat_history
- [ ] Tool calls detected and executed
- [ ] Tool results sent back to Cohere for final response
- [ ] Assistant response stored to database
- [ ] Response returned to frontend
- [ ] Stateless verified (no server state between requests)

**9-Step Flow Implementation**:
```python
# services/chat/service.py
class ChatService:
    async def process_message(
        self, user_id: str, message: str, conversation_id: int | None
    ) -> ChatResponse:
        # Step 1-2: JWT verified by router dependency

        # Step 3: Get or create conversation
        conversation = await self._get_or_create_conversation(user_id, conversation_id)

        # Step 4: Load history (max 20 messages)
        history = await self._load_history(conversation.id, user_id)

        # Step 5: Store user message
        await self._store_message(conversation.id, user_id, "user", message)

        # Step 6: Call Cohere with tools
        messages = self._build_cohere_messages(history, message)
        response = await self.cohere.chat(messages, self.tools)

        # Step 7: Execute tool calls if any
        tool_results = []
        if response.message.tool_calls:
            messages.append(response.message)
            for tc in response.message.tool_calls:
                result = await self.executor.execute(
                    tc.function.name, user_id, json.loads(tc.function.arguments)
                )
                tool_results.append(result)
                messages.append(self._format_tool_result(tc.id, result))

            # Call Cohere again with tool results
            response = await self.cohere.chat(messages, self.tools)

        # Step 8: Store assistant response
        await self._store_message(
            conversation.id, user_id, "assistant",
            response.message.content[0].text
        )

        # Step 9: Return response
        return ChatResponse(
            conversation_id=conversation.id,
            response=response.message.content[0].text,
            tool_calls=[r.to_dict() for r in tool_results]
        )
```

---

### Phase 4: Frontend Chat UI

**Goal**: Build responsive chat interface with message history and tool result display.

**Files to Create/Modify**:
- `frontend/app/(dashboard)/chat/page.tsx` - Chat page
- `frontend/components/features/chat/chat-container.tsx` - Main container
- `frontend/components/features/chat/message-list.tsx` - Message display
- `frontend/components/features/chat/message-item.tsx` - Single message
- `frontend/components/features/chat/chat-input.tsx` - Input with send
- `frontend/components/features/chat/typing-indicator.tsx` - Loading state
- `frontend/lib/api/chat.ts` - API client functions
- `frontend/components/layout/sidebar.tsx` - Add Chat nav link
- `frontend/app/(dashboard)/layout.tsx` - Ensure chat route included

**Acceptance Criteria**:
- [ ] Chat page accessible at /dashboard/chat
- [ ] Protected route (requires authentication)
- [ ] Message list displays conversation history
- [ ] User messages styled (right side, distinct color)
- [ ] Assistant messages styled (left side, distinct color)
- [ ] Message input with send button
- [ ] Enter key sends message
- [ ] Shift+Enter creates newline
- [ ] Typing indicator during API call
- [ ] New messages appear immediately
- [ ] Auto-scroll to latest message
- [ ] Error messages displayed with retry option
- [ ] Can start new conversation
- [ ] Can continue existing conversation
- [ ] Navigation link in sidebar
- [ ] Responsive on mobile devices
- [ ] Task list refreshes after tool executions

**Component Structure**:
```tsx
// chat/page.tsx
export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<number | null>(null)

  return (
    <div className="flex flex-col h-full">
      <ChatContainer>
        <MessageList messages={messages} />
        {isLoading && <TypingIndicator />}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </ChatContainer>
    </div>
  )
}
```

---

### Phase 5: Testing and Integration

**Goal**: End-to-end validation of chat functionality.

**Test Scenarios**:
1. Create task via chat: "Add a task to buy groceries"
2. List tasks via chat: "What are my tasks?"
3. Complete task via chat: "Mark groceries as done"
4. Delete task via chat: "Delete the groceries task"
5. Update task via chat: "Change task 1 to call mom"
6. Task sync: Create task in chat, verify in dashboard
7. User isolation: User A cannot see User B's conversations
8. Persistence: Conversation survives server restart
9. Error handling: Graceful response when Cohere API fails
10. Phase II unchanged: REST API and dashboard still work

**Acceptance Criteria**:
- [ ] All 5 natural language commands work correctly
- [ ] Task created via chat visible in Phase II dashboard
- [ ] Task created via dashboard accessible in chat
- [ ] Multiple users have isolated conversations
- [ ] Conversation persists after server restart
- [ ] Phase II REST API unchanged
- [ ] Phase II dashboard UI unchanged
- [ ] Chat response time under 5 seconds
- [ ] No console errors in browser

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │  Dashboard  │    │   Chat UI   │    │  Task List  │                 │
│  │   /dashboard│    │ /dashboard/ │    │  Component  │                 │
│  │             │    │    chat     │    │             │                 │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│         │                  │                  │                         │
│         └──────────────────┼──────────────────┘                         │
│                            │ JWT Token                                  │
└────────────────────────────┼────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (FastAPI)                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Routers                                   │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐ │   │
│  │  │  /auth/*   │  │/api/.../   │  │  POST /api/{user_id}/chat  │ │   │
│  │  │            │  │   tasks    │  │                            │ │   │
│  │  └────────────┘  └────────────┘  └─────────────┬──────────────┘ │   │
│  └────────────────────────────────────────────────┼────────────────┘   │
│                                                   │                     │
│  ┌────────────────────────────────────────────────┼────────────────┐   │
│  │                     Chat Service               │                │   │
│  │  ┌─────────────────────────────────────────────▼──────────────┐ │   │
│  │  │                    9-Step Stateless Flow                   │ │   │
│  │  │  1. Receive message                                        │ │   │
│  │  │  2. Verify JWT ──────────────────────┐                     │ │   │
│  │  │  3. Load/create conversation ◄───────┤                     │ │   │
│  │  │  4. Build chat_history (max 20) ◄────┤  PostgreSQL         │ │   │
│  │  │  5. Store user message ──────────────┤  (Neon)             │ │   │
│  │  │  6. Call Cohere API ─────────────────┼──┐                  │ │   │
│  │  │  7. Execute MCP tools ◄──────────────┤  │                  │ │   │
│  │  │  8. Store assistant message ─────────┤  │                  │ │   │
│  │  │  9. Return response                  │  │                  │ │   │
│  │  └──────────────────────────────────────┘  │                  │ │   │
│  │                                            │                  │ │   │
│  │  ┌─────────────────────┐  ┌────────────────▼────────────────┐ │   │
│  │  │    Tool Executor    │  │       Cohere Client            │ │   │
│  │  │  ┌───────────────┐  │  │  ┌─────────────────────────┐   │ │   │
│  │  │  │   add_task    │  │  │  │  model: command-r-plus  │   │ │   │
│  │  │  │  list_tasks   │  │  │  │  temperature: 0.3       │   │ │   │
│  │  │  │ complete_task │  │  │  │  tools: [5 MCP tools]   │   │ │   │
│  │  │  │  delete_task  │  │  │  │  preamble: defined      │   │ │   │
│  │  │  │  update_task  │  │  │  └─────────────────────────┘   │ │   │
│  │  │  └───────────────┘  │  └────────────────────────────────┘ │   │
│  │  └─────────────────────┘                                      │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                        Database Models                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌───────────────┐  ┌────────────┐  │   │
│  │  │  User   │  │  Task   │  │ Conversation  │  │  Message   │  │   │
│  │  │         │  │         │  │  (NEW)        │  │  (NEW)     │  │   │
│  │  └─────────┘  └─────────┘  └───────────────┘  └────────────┘  │   │
│  └───────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                            │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                        Cohere API                                │  │
│  │              https://api.cohere.ai/v2/chat                       │  │
│  │                                                                  │  │
│  │  Request:                    Response:                           │  │
│  │  - model                     - message.content                   │  │
│  │  - messages[]                - message.tool_calls[]              │  │
│  │  - tools[]                   - message.citations[]               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                     Neon PostgreSQL                              │  │
│  │              postgresql://.../neondb                             │  │
│  │                                                                  │  │
│  │  Tables: users, tasks, conversations (NEW), messages (NEW)       │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Cohere API complexity | Medium | High | Start with simple test, use playground first |
| Stateless architecture confusion | Medium | Medium | Follow 9-step pattern exactly, add logging |
| User isolation bugs | Low | Critical | Add explicit tests, code review all queries |
| Breaking Phase II | Low | High | Run Phase II tests after each change |
| Database migration issues | Low | Medium | Test locally first, prepare rollback script |
| Cohere rate limits | Medium | Medium | Implement retry with exponential backoff |

## Architectural Decisions

The following decisions were made during planning and should be documented via `/sp.adr`:

1. **Cohere API V2**: Selected over V1 for type-safe tool calls and no server-side conversation management
2. **Message History Limit**: 20 messages balances context vs. token costs
3. **Synchronous Tool Execution**: Simpler than parallel for CRUD operations
4. **Multiple Conversations per User**: Provides flexibility for conversation organization
5. **Error to AI Pattern**: Let Cohere explain errors naturally in conversation

📋 Architectural decisions detected. Document with `/sp.adr` after implementation begins.

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Chat response time | < 5 seconds (p95) | Manual timing / logging |
| Tool execution success | > 95% | Log analysis |
| User isolation | 100% | Security audit |
| Phase II functionality | 100% preserved | Manual testing |
| Natural language understanding | > 90% correct intent | User testing |

## Next Steps

1. Run `/sp.tasks` to generate detailed task list
2. Begin Phase 1: Database Foundation
3. Proceed sequentially through phases
4. Create ADRs for architectural decisions as implementation progresses
