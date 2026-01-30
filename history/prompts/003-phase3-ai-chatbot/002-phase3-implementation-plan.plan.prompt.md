---
id: 002
title: Phase III AI Chatbot Implementation Plan
stage: plan
date: 2026-01-17
surface: agent
model: claude-opus-4-5-20251101
feature: 003-phase3-ai-chatbot
branch: 003-phase3-ai-chatbot
user: user
command: /sp.plan
labels: ["planning", "cohere-api", "mcp-tools", "chat-integration", "phase-3"]
links:
  spec: specs/003-phase3-ai-chatbot/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/003-phase3-ai-chatbot/plan.md
  - specs/003-phase3-ai-chatbot/research.md
  - specs/003-phase3-ai-chatbot/data-model.md
  - specs/003-phase3-ai-chatbot/quickstart.md
  - specs/003-phase3-ai-chatbot/contracts/chat-api.yaml
  - specs/003-phase3-ai-chatbot/contracts/mcp-tools.md
tests:
  - null
---

## Prompt

/sp.plan

Project: Phase III AI Todo Chatbot Implementation Plan

Reference:
- specs/phase3/ (all Phase III specifications)
- specs/constitution.md (Phase III section)
- Panaversity Hackathon II Phase III documentation (Pages 17-21)

Context:
Create implementation plan for integrating AI-powered chatbot into existing Phase II todo application using Cohere API, MCP tools, and stateless architecture.

---

CREATE:

1. Architecture Sketch
   - Phase III component diagram
   - Chat flow architecture (User → Chat UI → FastAPI → Cohere → MCP Tools → Database)
   - Integration with existing Phase II components
   - Data flow for stateless requests
   - Database schema additions (Conversation, Message tables)
   - Cohere API integration points

2. Section Structure
   - Phase 1: Database Foundation (Conversation and Message models)
   - Phase 2: MCP Tools Implementation (5 tools with handlers)
   - Phase 3: Cohere API Integration (chat endpoint with stateless flow)
   - Phase 4: Frontend Chat UI (React components)
   - Phase 5: Testing and Integration (end-to-end validation)

3. Research Approach
   - Cohere API documentation (function calling/tools feature)
   - Cohere SDK for Python (cohere-ai package)
   - Best practices for stateless chat architecture
   - SQLModel relationship patterns (Conversation → Message)
   - React chat UI patterns and components
   - Natural language intent recognition strategies
   - Research concurrently with implementation (not all upfront)

4. Quality Validation
   - All 5 MCP tools working correctly
   - Cohere API integrated and calling tools
   - Stateless architecture implemented (conversation persists across restarts)
   - User isolation enforced (all queries filter by user_id)
   - JWT authentication working on chat endpoint
   - Chat UI responsive and user-friendly
   - No breaking changes to Phase II functionality
   - Database models created with proper indexes
   - Natural language commands understood and executed
   - Error handling graceful and informative

[Full prompt continues with DECISIONS, TESTING STRATEGY, TECHNICAL DETAILS, CRITICAL PATH, RISK MITIGATION, and SUCCESS CRITERIA sections as provided by user]

## Response snapshot

Executed `/sp.plan` workflow for Phase III AI Chatbot integration:

**Phase 0 - Research** (complete):
- Created `research.md` documenting Cohere API v2 tool calling, Python SDK 5.20.1, multi-turn conversation format, message roles, and error handling strategies

**Phase 1 - Design & Contracts** (complete):
- Created `data-model.md` with Conversation and Message entity definitions, SQLModel schemas, migration scripts, query patterns, and security considerations
- Created `contracts/chat-api.yaml` OpenAPI specification for POST /api/{user_id}/chat endpoint with all request/response schemas
- Created `contracts/mcp-tools.md` defining all 5 MCP tools (add_task, list_tasks, complete_task, delete_task, update_task) with Cohere function schemas and implementation guidelines
- Created `quickstart.md` with development setup instructions

**Implementation Plan** (complete):
- Filled `plan.md` with 5-phase implementation structure
- Architecture diagram showing 9-step stateless flow
- Constitution check passing all principles
- Risk mitigation strategies documented
- Success metrics defined

**Agent Context** updated via `update-agent-context.ps1`

## Outcome

- ✅ Impact: Complete implementation plan ready for Phase III AI chatbot development
- 🧪 Tests: No tests created (planning phase)
- 📁 Files: 6 files created/modified (plan.md, research.md, data-model.md, quickstart.md, chat-api.yaml, mcp-tools.md)
- 🔁 Next prompts: Run `/sp.tasks` to generate detailed task breakdown, then begin implementation with Phase 1 (Database Foundation)
- 🧠 Reflection: Cohere API v2 research was critical - the SDK has evolved significantly and understanding the message/tool format upfront prevents implementation issues

## Evaluation notes (flywheel)

- Failure modes observed: None - web research successfully retrieved Cohere API documentation
- Graders run and results (PASS/FAIL): N/A (planning phase)
- Prompt variant (if applicable): Standard /sp.plan with comprehensive user-provided context
- Next experiment (smallest change to try): Validate Cohere tool definitions in playground before implementing handlers
