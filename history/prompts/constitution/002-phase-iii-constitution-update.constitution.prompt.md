---
id: 002
title: Phase III Constitution Update - AI Chatbot Integration
stage: constitution
date: 2026-01-16
surface: agent
model: claude-opus-4-5
feature: phase-iii-ai-chatbot
branch: main
user: developer
command: /sp.constitution
labels: ["constitution", "phase-iii", "cohere-api", "mcp-tools", "stateless", "chat"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
tests:
  - N/A (documentation update)
---

## Prompt

/sp.constitution

Project: Phase III - AI Todo Chatbot Integration

Context:
Integrate AI-powered chatbot into existing Phase II full-stack todo application. Users manage tasks through natural language conversation using Cohere API, MCP tools, and stateless architecture.

Existing Project (Phase II):
- Frontend: Next.js 16+ with Better Auth (JWT)
- Backend: Python FastAPI with SQLModel
- Database: Neon Serverless PostgreSQL
- REST API: Task CRUD operations working

Phase III Additions:
- Conversational interface using Cohere API
- 5 MCP tools for task operations
- Stateless chat endpoint with database persistence
- Chat UI component
- Conversation and Message database models

Key requirements specified:
- Technology Stack: Cohere API (command-r-plus model), cohere-ai Python SDK
- Architecture: Stateless design with database persistence
- Security: User isolation, JWT verification, API key protection
- Database: New Conversation and Message tables
- API: New POST /api/{user_id}/chat endpoint
- MCP Tools: 5 tools (add_task, list_tasks, complete_task, delete_task, update_task)
- Chat UI: React components with typing indicator, auto-scroll, accessibility

## Response snapshot

Updated constitution from v1.0.0 to v2.0.0 (MAJOR version bump).

Key changes made:
1. Added 4 new core principles (VI-IX):
   - VI. Stateless Architecture
   - VII. AI Integration
   - VIII. MCP Tools Specification
   - IX. Chat UI Requirements

2. Updated existing principles:
   - Security First: Added API key protection for Cohere
   - Code Quality: Added async/await for Cohere API
   - User Experience: Added chat UX requirements
   - Data Integrity: Added Conversation/Message foreign keys and indexes

3. Technology Standards: Added Cohere API and cohere-ai SDK

4. API Contract: Added POST /api/{user_id}/chat endpoint

5. Data Model: Added conversations and messages tables

6. Non-Negotiables: Added 6 new Phase III rules (8-13)

7. Success Criteria: Added 13 Phase III-specific criteria

8. Integration Summary: Documented how Phase II and III work together

## Outcome

- ✅ Impact: Major constitution update enabling Phase III AI chatbot development
- 🧪 Tests: N/A (documentation)
- 📁 Files: 1 file updated (.specify/memory/constitution.md)
- 🔁 Next prompts: /sp.specify for Phase III feature spec, /sp.plan for implementation planning
- 🧠 Reflection: Constitution now provides complete governance for AI chatbot integration while preserving all Phase II requirements

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): N/A (documentation)
- Prompt variant (if applicable): Standard constitution update
- Next experiment (smallest change to try): Validate constitution against actual implementation
