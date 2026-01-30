# Spec-Kit Plus Methodology Skill

## Purpose

Guide for organizing specifications using Spec-Kit Plus methodology in monorepo structure for Phase II hackathon. Spec-Kit Plus is a Spec-Driven Development (SDD) framework that ensures consistent, traceable, and well-documented software development.

---

## What is Spec-Kit Plus?

Spec-Kit Plus is a structured methodology that:

1. **Specifies before building** - Requirements documented before code
2. **Plans before implementing** - Architecture decisions made explicit
3. **Tasks before coding** - Work broken into trackable units
4. **Records everything** - PHRs and ADRs capture decisions

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SPEC-KIT PLUS WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   /sp.specify          /sp.plan           /sp.tasks        /sp.implement │
│       │                    │                   │                  │      │
│       ▼                    ▼                   ▼                  ▼      │
│   ┌────────┐          ┌────────┐          ┌────────┐        ┌────────┐  │
│   │ spec.md│ ───────► │plan.md │ ───────► │tasks.md│ ─────► │  Code  │  │
│   └────────┘          └────────┘          └────────┘        └────────┘  │
│                                                                          │
│   What to build       How to build        What to do        Build it    │
│   (Requirements)      (Architecture)      (Work items)      (Execute)   │
│                                                                          │
│   + User Stories      + Tech Stack        + Phases          + Tests     │
│   + Acceptance        + Constraints       + Dependencies    + Features  │
│   + Edge Cases        + Structure         + Checkpoints     + Polish    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Structure

```
project-root/
│
├── .specify/                          # Spec-Kit Plus system files
│   ├── memory/
│   │   └── constitution.md            # Project principles & standards
│   ├── templates/
│   │   ├── spec-template.md           # Feature specification template
│   │   ├── plan-template.md           # Implementation plan template
│   │   ├── tasks-template.md          # Task list template
│   │   ├── adr-template.md            # Architecture Decision Record
│   │   ├── phr-template.prompt.md     # Prompt History Record
│   │   └── checklist-template.md      # Custom checklist template
│   └── scripts/
│       └── powershell/                # Automation scripts
│
├── specs/                             # Feature specifications
│   ├── user-auth/                     # Feature: User Authentication
│   │   ├── spec.md                    # Requirements & user stories
│   │   ├── plan.md                    # Architecture & design
│   │   ├── tasks.md                   # Implementation tasks
│   │   ├── research.md                # Technical research (optional)
│   │   ├── data-model.md              # Entity definitions (optional)
│   │   └── contracts/                 # API contracts (optional)
│   │       └── auth-api.yaml
│   │
│   └── task-crud/                     # Feature: Task CRUD
│       ├── spec.md
│       ├── plan.md
│       └── tasks.md
│
├── history/                           # Development history
│   ├── prompts/                       # Prompt History Records (PHRs)
│   │   ├── constitution/              # Constitution-related prompts
│   │   ├── user-auth/                 # Feature-specific prompts
│   │   ├── task-crud/
│   │   └── general/                   # General/misc prompts
│   └── adr/                           # Architecture Decision Records
│       ├── 001-frontend-stack.md
│       ├── 002-auth-strategy.md
│       └── 003-database-choice.md
│
├── frontend/                          # Next.js application
│   ├── app/
│   ├── components/
│   └── lib/
│
├── backend/                           # FastAPI application
│   ├── main.py
│   ├── models.py
│   └── routes/
│
├── .claude/                           # Claude Code configuration
│   ├── skills/                        # Development skills
│   └── agents/                        # Specialized agents
│
├── CLAUDE.md                          # Project instructions
└── .env.example                       # Environment template
```

---

## Core Artifacts

### 1. Constitution (`constitution.md`)

The project's guiding principles. Located at `.specify/memory/constitution.md`.

**Purpose:** Define non-negotiable rules for the entire project.

```markdown
# [Project Name] Constitution

## Core Principles

### I. Security First
- All user data must be isolated by user_id
- JWT verification on all protected endpoints
- Never expose other users' data

### II. Type Safety
- TypeScript strict mode on frontend
- Pydantic/SQLModel on backend
- All APIs fully typed

### III. Test-First (When Required)
- Tests before implementation for critical paths
- Red-Green-Refactor cycle

### IV. Simplicity
- Smallest viable change
- No premature abstraction
- YAGNI principles

## Governance
Constitution supersedes all other practices.
Amendments require documentation and approval.

**Version**: 1.0.0 | **Ratified**: 2024-01-01
```

---

### 2. Feature Specification (`spec.md`)

What to build - user stories and requirements. Located at `specs/<feature>/spec.md`.

**Purpose:** Define WHAT the feature does, not HOW.

**Structure:**

```markdown
# Feature Specification: [FEATURE NAME]

**Feature Branch**: `feature/user-auth`
**Created**: 2024-01-15
**Status**: Draft | In Review | Approved

## User Scenarios & Testing

### User Story 1 - User Login (Priority: P1)

As a user, I want to log in with email and password so I can access my tasks.

**Why this priority**: Core functionality - nothing works without auth.

**Independent Test**: Can be tested by attempting login and verifying dashboard access.

**Acceptance Scenarios**:

1. **Given** valid credentials, **When** user submits login form, **Then** redirect to dashboard
2. **Given** invalid password, **When** user submits login form, **Then** show error message
3. **Given** non-existent email, **When** user submits login form, **Then** show "user not found"

---

### User Story 2 - User Registration (Priority: P2)

[Similar structure...]

---

### Edge Cases

- What happens when email already exists?
- How does system handle network errors?
- What if session expires mid-operation?

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to register with email/password
- **FR-002**: System MUST validate email format
- **FR-003**: System MUST hash passwords before storage
- **FR-004**: System MUST issue JWT on successful login

### Key Entities

- **User**: id, email, name, password_hash, created_at
- **Session**: id, user_id, token, expires_at

## Success Criteria

- **SC-001**: Users can complete registration in under 30 seconds
- **SC-002**: Login response time under 500ms
- **SC-003**: 99.9% of valid login attempts succeed
```

---

### 3. Implementation Plan (`plan.md`)

How to build it - architecture and technical decisions. Located at `specs/<feature>/plan.md`.

**Purpose:** Define HOW the feature will be implemented.

**Structure:**

```markdown
# Implementation Plan: User Authentication

**Branch**: `feature/user-auth` | **Date**: 2024-01-15 | **Spec**: ./spec.md

## Summary

Implement user authentication using Better Auth on Next.js frontend with JWT verification on FastAPI backend.

## Technical Context

**Language/Version**: Python 3.11, TypeScript 5.3
**Primary Dependencies**: FastAPI, Better Auth, SQLModel
**Storage**: Neon PostgreSQL
**Testing**: pytest, Vitest
**Target Platform**: Web (Next.js + FastAPI)

## Constitution Check

✅ Security First: JWT verification on all endpoints
✅ Type Safety: Pydantic models, TypeScript strict
✅ Simplicity: Using established auth library

## Project Structure

### Source Code

```text
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── api/auth/[...all]/route.ts
├── lib/
│   ├── auth.ts
│   └── auth-client.ts
└── middleware.ts

backend/
├── main.py
├── models.py
├── middleware/
│   └── jwt_auth.py
└── routes/
    └── users.py
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth Library | Better Auth | Modern, TypeScript-first, JWT support |
| Token Storage | httpOnly Cookie | XSS protection |
| Password Hash | Argon2 | Current best practice |

## Complexity Tracking

No violations - design follows constitution.
```

---

### 4. Task List (`tasks.md`)

What to do - specific implementation tasks. Located at `specs/<feature>/tasks.md`.

**Purpose:** Break work into trackable, parallelizable units.

**Structure:**

```markdown
# Tasks: User Authentication

**Prerequisites**: plan.md (required), spec.md (required)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, etc.)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization

- [ ] T001 Create project structure per plan.md
- [ ] T002 [P] Install Better Auth dependencies
- [ ] T003 [P] Install FastAPI dependencies

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST complete before stories

- [ ] T004 Create User model in backend/models.py
- [ ] T005 [P] Setup database connection in backend/db.py
- [ ] T006 [P] Configure Better Auth in frontend/lib/auth.ts
- [ ] T007 Create JWT middleware in backend/middleware/jwt_auth.py

**Checkpoint**: Foundation ready - user story work can begin

---

## Phase 3: User Story 1 - User Login (Priority: P1) 🎯 MVP

**Goal**: Users can log in and access protected resources

### Implementation

- [ ] T008 [US1] Create login page at frontend/app/(auth)/login/page.tsx
- [ ] T009 [US1] Create LoginForm component
- [ ] T010 [US1] Add auth API route at frontend/app/api/auth/[...all]/route.ts
- [ ] T011 [US1] Create middleware.ts for route protection
- [ ] T012 [US1] Test login flow end-to-end

**Checkpoint**: Login working independently

---

## Phase 4: User Story 2 - User Registration (Priority: P2)

**Goal**: New users can create accounts

### Implementation

- [ ] T013 [US2] Create register page at frontend/app/(auth)/register/page.tsx
- [ ] T014 [US2] Create RegisterForm component
- [ ] T015 [US2] Add email validation
- [ ] T016 [US2] Test registration flow

**Checkpoint**: Registration working independently

---

## Dependencies & Execution Order

- **Phase 1**: No dependencies - start immediately
- **Phase 2**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3+**: All depend on Phase 2 completion

### Parallel Opportunities

- T002 and T003 can run in parallel (different projects)
- T005 and T006 can run in parallel (different files)
- After Phase 2, US1 and US2 can run in parallel

---

## Notes

- [P] = parallelizable (different files, no dependencies)
- Commit after each task or logical group
- Stop at any checkpoint to validate
```

---

### 5. Prompt History Record (PHR)

Record of every significant interaction. Located at `history/prompts/<feature>/<id>-<slug>.prompt.md`.

**Purpose:** Capture decisions, context, and learnings from AI interactions.

**Routing Rules:**

| Stage | Location |
|-------|----------|
| `constitution` | `history/prompts/constitution/` |
| `spec`, `plan`, `tasks`, `red`, `green`, `refactor` | `history/prompts/<feature-name>/` |
| `general` | `history/prompts/general/` |

**Structure:**

```markdown
---
id: 001
title: Implement Login Form Component
stage: green
date: 2024-01-15
surface: agent
model: claude-opus-4-5-20251101
feature: user-auth
branch: feature/user-auth
user: developer
command: /sp.implement
labels: ["auth", "frontend", "login"]
links:
  spec: specs/user-auth/spec.md
  ticket: null
  adr: history/adr/002-auth-strategy.md
  pr: null
files:
  - frontend/components/forms/LoginForm.tsx
  - frontend/lib/auth-client.ts
tests:
  - frontend/__tests__/LoginForm.test.tsx
---

## Prompt

Create the LoginForm component with email and password fields, validation, error handling, and Better Auth integration.

## Response snapshot

Created LoginForm.tsx with:
- Email/password inputs with validation
- Loading state during submission
- Error display for failed attempts
- Redirect to dashboard on success

## Outcome

- ✅ Impact: Core login functionality complete
- 🧪 Tests: Added LoginForm.test.tsx
- 📁 Files: 2 created
- 🔁 Next prompts: Add "forgot password" link
- 🧠 Reflection: Consider adding rate limiting

## Evaluation notes

- Failure modes observed: None
- Graders run and results: Manual test PASS
- Next experiment: Add remember me checkbox
```

---

### 6. Architecture Decision Record (ADR)

Document significant architectural decisions. Located at `history/adr/<id>-<title>.md`.

**Purpose:** Capture WHY decisions were made for future reference.

**When to Create:**

Test ALL three criteria (must all be true):

1. **Impact**: Long-term consequences for architecture/platform/security?
2. **Alternatives**: Multiple viable options considered with tradeoffs?
3. **Scope**: Cross-cutting concern influencing system design?

**Structure:**

```markdown
# ADR-001: Frontend Stack Selection

- **Status:** Accepted
- **Date:** 2024-01-10
- **Feature:** Core Infrastructure
- **Context:** Need to select frontend framework for Phase II hackathon

## Decision

Use Next.js 16+ with App Router, TypeScript, and Tailwind CSS.

**Stack Components:**
- Framework: Next.js 16 (App Router)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS v3
- Auth: Better Auth
- Deployment: Vercel

## Consequences

### Positive

- Excellent TypeScript support
- Server Components reduce client bundle
- Built-in API routes
- Fast development with App Router
- Easy Vercel deployment

### Negative

- Learning curve for App Router patterns
- Some library compatibility issues
- Vercel lock-in for optimal experience

## Alternatives Considered

**Alternative A: Remix + styled-components**
- Rejected: Less ecosystem support, more complex setup

**Alternative B: Vite + React SPA**
- Rejected: No SSR, more configuration needed

## References

- Feature Spec: specs/core-setup/spec.md
- Related ADRs: ADR-002 (Auth Strategy)
```

---

## Available Commands (Skills)

Spec-Kit Plus provides slash commands for workflow automation:

| Command | Purpose | Input | Output |
|---------|---------|-------|--------|
| `/sp.specify` | Create feature spec | Feature description | `specs/<feature>/spec.md` |
| `/sp.clarify` | Clarify spec gaps | Existing spec | Updated spec with answers |
| `/sp.plan` | Create implementation plan | spec.md | `specs/<feature>/plan.md` |
| `/sp.tasks` | Generate task list | plan.md + spec.md | `specs/<feature>/tasks.md` |
| `/sp.implement` | Execute tasks | tasks.md | Code changes |
| `/sp.adr` | Create ADR | Decision title | `history/adr/<id>-<title>.md` |
| `/sp.phr` | Create PHR manually | Prompt details | `history/prompts/<location>/<id>.md` |
| `/sp.constitution` | Update constitution | Principles | `.specify/memory/constitution.md` |
| `/sp.analyze` | Analyze consistency | All artifacts | Report of issues |
| `/sp.checklist` | Generate checklist | Requirements | Custom checklist |

---

## Workflow Phases

### Phase 0: Project Setup

```bash
# 1. Initialize project structure
project-root/
├── .specify/
├── specs/
├── history/
├── frontend/
└── backend/

# 2. Create constitution
/sp.constitution "Define core principles"

# 3. Create architecture ADR
/sp.adr "technology-stack"
```

### Phase 1: Specification

```bash
# 1. Create feature specification
/sp.specify "User authentication with email/password login"

# 2. Clarify any gaps
/sp.clarify

# 3. Review and approve spec
# Manual review of specs/<feature>/spec.md
```

### Phase 2: Planning

```bash
# 1. Create implementation plan
/sp.plan

# 2. Document architectural decisions
/sp.adr "auth-strategy"

# 3. Review and approve plan
# Manual review of specs/<feature>/plan.md
```

### Phase 3: Task Generation

```bash
# 1. Generate task list
/sp.tasks

# 2. Review parallelization opportunities
# Check for [P] markers

# 3. Validate dependencies
# Ensure phases are correctly ordered
```

### Phase 4: Implementation

```bash
# 1. Execute tasks in order
/sp.implement

# 2. Complete each phase checkpoint
# Validate functionality before moving on

# 3. Create PHRs for significant work
# Automatic or via /sp.phr
```

---

## User Story Priority System

Stories are prioritized P1 → P2 → P3 etc. Each story is independently testable.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MVP DELIVERY STRATEGY                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Setup → Foundational → P1 Story → [STOP] MVP Ready!                   │
│                              │                                           │
│                              ├─────────► P2 Story → Enhanced Product    │
│                              │                                           │
│                              └─────────► P3 Story → Full Product        │
│                                                                          │
│   Each story adds value without breaking previous stories.              │
│   Stop at any point to demo/deploy a working product.                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Prioritization Guidelines:**

| Priority | Description | Example |
|----------|-------------|---------|
| **P1** | Core functionality - nothing works without it | Login |
| **P2** | Important but not blocking | Registration |
| **P3** | Nice to have | Password reset |
| **P4** | Future enhancement | Social login |

---

## Best Practices

### 1. Specify Before Building

```
✅ Write spec.md → Get approval → Write code
❌ Write code → Document what you built
```

### 2. Keep Artifacts in Sync

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ spec.md  │ ──► │ plan.md  │ ──► │ tasks.md │
└──────────┘     └──────────┘     └──────────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
              All must agree!
```

### 3. Create PHRs for Significant Work

**Create PHR for:**
- Implementation of new features
- Architecture decisions
- Debugging sessions
- Multi-step workflows

**Skip PHR for:**
- Simple questions
- Typo fixes
- Formatting changes

### 4. Document ADRs Promptly

When you make a significant decision:

```
📋 Architectural decision detected: JWT-based authentication
   Document reasoning and tradeoffs? Run `/sp.adr jwt-auth-strategy`
```

### 5. Use Checkpoints

After each phase, validate before moving on:

```markdown
## Phase 3: User Story 1 - Login (P1) 🎯 MVP

- [ ] T008 Create login page
- [ ] T009 Create LoginForm
- [ ] T010 Add auth API route

**Checkpoint**: Login working independently
→ Test manually before continuing to Phase 4
```

### 6. Parallel Task Identification

Mark tasks that can run in parallel with `[P]`:

```markdown
- [ ] T005 [P] Setup database connection
- [ ] T006 [P] Configure Better Auth
- [ ] T007 [P] Create base components

# These can all run simultaneously (different files)
```

---

## Integration with Claude Code

### Agent Configuration

Specialized agents are defined in `.claude/agents/`:

| Agent | Purpose |
|-------|---------|
| `spec-writer` | Create/update specifications |
| `architecture-planner` | Design system architecture |
| `database-engineer` | Database models and queries |
| `backend-engineer` | FastAPI implementation |
| `frontend-engineer` | Next.js implementation |
| `integration-tester` | End-to-end testing |

### Skill Files

Development skills in `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `nextjs-fullstack` | Next.js development guide |
| `fastapi-sqlmodel` | FastAPI + SQLModel guide |
| `better-auth-jwt` | Authentication integration |
| `neon-sqlmodel` | Neon PostgreSQL + SQLModel |
| `spec-kit-plus` | This methodology guide |

### CLAUDE.md Integration

The `CLAUDE.md` file configures Claude Code for Spec-Kit Plus:

```markdown
# Core Guarantees

- Record every user input in a PHR
- Suggest ADRs for significant decisions
- Follow constitution principles
- Create smallest viable changes
```

---

## Quick Reference

### File Naming Conventions

| Artifact | Pattern | Example |
|----------|---------|---------|
| Feature Spec | `specs/<feature>/spec.md` | `specs/user-auth/spec.md` |
| Implementation Plan | `specs/<feature>/plan.md` | `specs/user-auth/plan.md` |
| Task List | `specs/<feature>/tasks.md` | `specs/user-auth/tasks.md` |
| PHR | `history/prompts/<location>/<id>-<slug>.prompt.md` | `history/prompts/user-auth/001-login-form.prompt.md` |
| ADR | `history/adr/<id>-<title>.md` | `history/adr/001-frontend-stack.md` |

### Stages for PHR Routing

| Stage | Description | Location |
|-------|-------------|----------|
| `constitution` | Project principles | `history/prompts/constitution/` |
| `spec` | Feature specification | `history/prompts/<feature>/` |
| `plan` | Implementation planning | `history/prompts/<feature>/` |
| `tasks` | Task generation | `history/prompts/<feature>/` |
| `red` | Test writing (TDD) | `history/prompts/<feature>/` |
| `green` | Implementation | `history/prompts/<feature>/` |
| `refactor` | Code improvement | `history/prompts/<feature>/` |
| `general` | Other/misc | `history/prompts/general/` |

### Task Markers

| Marker | Meaning |
|--------|---------|
| `[P]` | Can run in parallel |
| `[US1]` | Belongs to User Story 1 |
| `[US2]` | Belongs to User Story 2 |
| `🎯 MVP` | Minimum viable product milestone |

---

## Example: Complete Feature Workflow

### 1. Specify the Feature

```bash
/sp.specify "Task CRUD - Users can create, read, update, and delete tasks"
```

Output: `specs/task-crud/spec.md`

### 2. Clarify Gaps

```bash
/sp.clarify
```

Questions like:
- What fields should a task have?
- Can tasks have due dates?
- Should tasks support categories?

### 3. Plan Implementation

```bash
/sp.plan
```

Output: `specs/task-crud/plan.md`

### 4. Generate Tasks

```bash
/sp.tasks
```

Output: `specs/task-crud/tasks.md`

### 5. Implement

```bash
/sp.implement
```

Output: Code changes, tests, documentation

### 6. Document Decision (if significant)

```bash
/sp.adr "task-data-model"
```

Output: `history/adr/003-task-data-model.md`

---

## Hackathon Tips

1. **Start with Constitution** - Define your principles early
2. **Prioritize Ruthlessly** - P1 only for MVP, add P2/P3 if time allows
3. **Use Checkpoints** - Validate each phase before moving on
4. **Parallelize When Possible** - Frontend and backend can develop simultaneously
5. **Create ADRs for Key Decisions** - You'll thank yourself later
6. **PHRs are Your Memory** - Record significant work for context
7. **Keep Specs Updated** - If requirements change, update spec first
