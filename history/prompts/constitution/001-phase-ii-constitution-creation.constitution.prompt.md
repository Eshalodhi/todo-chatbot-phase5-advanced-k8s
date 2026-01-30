---
id: 001
title: Phase II Constitution Creation
stage: constitution
date: 2026-01-01
surface: agent
model: claude-opus-4-5-20251101
feature: none
branch: master
user: developer
command: /sp.constitution
labels: ["constitution", "governance", "phase-ii", "hackathon"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
tests:
  - null
---

## Prompt

Project: Phase II Full-Stack Web Application (Panaversity Hackathon II)

Core Principles:
- Spec-Driven Development: All specifications written before code
- Security First: User isolation, JWT verification, password hashing
- Code Quality: TypeScript strict mode, Python type hints, Pydantic validation
- User Experience: Responsive design, loading states, error handling
- Data Integrity: Persistent storage, foreign key relationships, indexed queries

Key Standards:
- Frontend: Next.js 16+ (App Router), TypeScript strict mode, Tailwind CSS, Better Auth
- Backend: Python FastAPI, SQLModel ORM, JWT verification, async route handlers
- Database: Neon PostgreSQL, indexed foreign keys (user_id, completed), ON DELETE CASCADE
- Authentication: Better Auth issues JWT → Frontend attaches to requests → Backend verifies with shared BETTER_AUTH_SECRET
- API Pattern: /api/{user_id}/tasks with JWT in Authorization: Bearer <token> header
- User Isolation: ALL queries filter by authenticated user_id from JWT token

Constraints:
- Technology Stack: MUST use Next.js 16+, Python FastAPI, SQLModel, Neon PostgreSQL, Better Auth
- Monorepo: Single repository with frontend/ and backend/ folders
- Spec-Kit Plus: Organized specs in specs/features/, specs/api/, specs/database/, specs/ui/
- No External Dependencies: Standard libraries only (no unnecessary packages)
- Security: NEVER store plain text passwords, ALWAYS verify JWT, ALWAYS filter by user_id

API Endpoints (EXACT):
- GET    /api/{user_id}/tasks - List all tasks
- POST   /api/{user_id}/tasks - Create new task
- GET    /api/{user_id}/tasks/{id} - Get task details
- PUT    /api/{user_id}/tasks/{id} - Update task
- DELETE /api/{user_id}/tasks/{id} - Delete task
- PATCH  /api/{user_id}/tasks/{id}/complete - Toggle completion

Data Model:
- users: id (PK), email (unique, indexed), name, password_hash, created_at
- tasks: id (PK), user_id (FK→users.id, indexed), title (1-200 chars), description (max 1000), completed (indexed), created_at, updated_at

Authentication Flow (5 Steps):
1. User logs in → Better Auth creates session and issues JWT
2. Frontend makes API call → Includes JWT in Authorization: Bearer <token> header
3. Backend receives request → Extracts token, verifies signature with BETTER_AUTH_SECRET
4. Backend identifies user → Decodes token to get user_id, matches with URL {user_id}
5. Backend filters data → Returns only tasks belonging to that user

Environment Variables:
- Frontend: NEXT_PUBLIC_API_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL
- Backend: DATABASE_URL, BETTER_AUTH_SECRET (MUST match frontend), CORS_ORIGINS
- CRITICAL: BETTER_AUTH_SECRET must be identical in both environments

Five Basic Features:
1. Create Task: Title required (1-200 chars), description optional (max 1000), associated with user
2. View Tasks: Only show user's own tasks, display title/status/date, sorted by created_at DESC
3. Update Task: Edit title/description, only own tasks, validation enforced
4. Delete Task: Remove task, only own tasks, confirmation required
5. Mark Complete: Toggle completed status, only own tasks, visual indicator

Success Criteria:
- All 5 features working in web UI
- Multi-user authentication functional (Better Auth + JWT)
- User isolation verified (User A cannot see User B's tasks)
- Data persists in Neon PostgreSQL
- Responsive UI (mobile, tablet, desktop)
- Deployed to production (Vercel + Render/Railway)
- Zero security vulnerabilities (password hashing, JWT verification, user_id filtering)
- No TypeScript errors, no console errors, no Python type errors

Non-Negotiables:
- JWT verification on ALL protected routes
- User_id validation: token user_id MUST match URL {user_id}
- ALL database queries MUST filter by authenticated user_id
- Passwords MUST be hashed with bcrypt (NEVER plain text)
- Index on tasks.user_id (CRITICAL for query performance)
- TypeScript strict mode enabled
- Server Components by default, 'use client' only when needed

## Response snapshot

Created comprehensive project constitution v1.0.0 with:
- 5 Core Principles: Spec-Driven Development, Security First, Code Quality, User Experience, Data Integrity
- Technology Standards table with mandatory stack
- Complete API Contract with 6 endpoints
- Data Model for users and tasks tables
- 5-step Authentication Flow documentation
- Environment Variables specification
- 7 Non-Negotiables checklist
- 10-point Success Criteria
- Governance section with amendment process

Constitution saved to `.specify/memory/constitution.md`

## Outcome

- Impact: Established project governance foundation for Phase II hackathon
- Tests: N/A (documentation artifact)
- Files: 1 created (.specify/memory/constitution.md)
- Next prompts: /sp.specify for feature specifications, /sp.adr for architectural decisions
- Reflection: Constitution provides clear, testable constraints for all team members

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): Manual review PASS
- Prompt variant (if applicable): N/A
- Next experiment: Verify constitution check integration with plan template
