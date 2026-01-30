# Tasks: Frontend UI Implementation

**Input**: Design documents from `/specs/001-frontend-ui-specs/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/tasks-api.yaml

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story reference (US1-US5)
- File paths relative to `frontend/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and core tooling per quickstart.md

- [X] T001 Initialize Next.js 16+ project with TypeScript, Tailwind, ESLint, App Router in `frontend/`
- [X] T002 [P] Install core dependencies: better-auth, framer-motion, react-hook-form, zod
- [X] T003 [P] Install UI dependencies: clsx, tailwind-merge, lucide-react, react-hot-toast
- [X] T004 [P] Install dev dependencies: vitest, @testing-library/react, playwright
- [X] T005 Configure TypeScript strict mode in `frontend/tsconfig.json`
- [X] T006 Initialize shadcn/ui with default style, slate base color, CSS variables
- [X] T007 [P] Install shadcn components: button, input, label, dialog, dropdown-menu, avatar, checkbox
- [X] T008 Create project structure: `components/ui/`, `components/features/`, `components/layout/`, `components/providers/`, `lib/`, `hooks/`, `types/`
- [X] T009 [P] Create `frontend/.env.local` with NEXT_PUBLIC_API_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL

**Checkpoint**: `pnpm dev` starts without errors, `pnpm tsc --noEmit` passes

---

## Phase 2: Foundation (Design System & Atomic Components)

**Purpose**: Design tokens and reusable UI primitives that ALL stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T010 Add design system CSS variables to `frontend/app/globals.css` (colors, typography, spacing, shadows from design-system.md)
- [X] T011 Configure Tailwind with custom colors and fonts in `frontend/tailwind.config.ts`
- [X] T012 [P] Create `frontend/lib/utils.ts` with cn() helper function
- [X] T013 [P] Create TypeScript types in `frontend/types/index.ts` (User, Task, DTOs from data-model.md)
- [X] T014 [P] Create Zod validation schemas in `frontend/lib/validations.ts` (createTaskSchema, loginSchema, registerSchema)
- [X] T015 Create Button component with all variants in `frontend/components/ui/button.tsx`
- [X] T016 [P] Create Input component with floating labels in `frontend/components/ui/input.tsx`
- [X] T017 [P] Create Checkbox component with animation in `frontend/components/ui/checkbox.tsx`
- [X] T018 [P] Create Dialog/Modal component in `frontend/components/ui/dialog.tsx`
- [X] T019 [P] Create Toast component in `frontend/components/ui/toast.tsx`
- [X] T020 [P] Create Skeleton loader component in `frontend/components/ui/skeleton.tsx`
- [X] T021 Create ToastProvider in `frontend/components/providers/toast-provider.tsx`

**Checkpoint**: All atomic components render correctly with TypeScript passing

---

## Phase 3: User Story 3 - Authenticate and Access (Priority: P1)

**Goal**: Securely register, log in, and maintain session with protected route access

**Independent Test**: Complete registration, login, verify access to protected dashboard, logout clears session

**Why First**: Authentication gates ALL functionality - must complete before US1/US2

### Implementation for User Story 3

- [X] T022 [US3] Configure Better Auth in `frontend/lib/auth.ts` with JWT plugin
- [X] T023 [US3] Create AuthProvider context in `frontend/components/providers/auth-provider.tsx`
- [X] T024 [US3] Create useAuth hook in `frontend/hooks/use-auth.ts`
- [X] T025 [US3] Create Header component with user menu in `frontend/components/layout/header.tsx`
- [X] T026 [US3] Create root layout with providers in `frontend/app/layout.tsx`
- [X] T027 [P] [US3] Create landing page at `frontend/app/page.tsx` with hero, features, CTAs
- [X] T028 [P] [US3] Create auth layout in `frontend/app/(auth)/layout.tsx`
- [X] T029 [US3] Create login page at `frontend/app/(auth)/login/page.tsx` with glassmorphism card
- [X] T030 [US3] Create register page at `frontend/app/(auth)/register/page.tsx` with password strength
- [X] T031 [US3] Implement form validation with React Hook Form + Zod in login/register forms
- [X] T032 [US3] Add floating label animations to auth form inputs
- [X] T033 [US3] Create protected route middleware in `frontend/middleware.ts`
- [X] T034 [US3] Create dashboard layout in `frontend/app/(dashboard)/layout.tsx`
- [X] T035 [US3] Implement logout with session cleanup in Header user menu
- [X] T036 [US3] Add loading states during auth operations (spinners)
- [X] T037 [US3] Add auth error handling with toast notifications

**Checkpoint**: Registration creates account, login redirects to dashboard, protected routes redirect unauthenticated users to login

---

## Phase 4: User Story 1 - View and Manage Tasks (Priority: P1)

**Goal**: Authenticated user views task list, marks tasks complete, sees stats

**Independent Test**: Login, verify task list displays with stats (total, pending, completed), toggle completion works

**Depends on**: US3 (authentication)

### Implementation for User Story 1

- [X] T038 [US1] Create API client with JWT attachment in `frontend/lib/api.ts`
- [X] T039 [US1] Create useTasks hook for data fetching in `frontend/hooks/use-tasks.ts`
- [X] T040 [US1] Create Sidebar component in `frontend/components/layout/sidebar.tsx`
- [X] T041 [US1] Create TaskCard component with hover effects in `frontend/components/features/task-card.tsx`
- [X] T042 [US1] Create TaskList component with staggered animations in `frontend/components/features/task-list.tsx`
- [X] T043 [US1] Create TaskStats component with animated counters in `frontend/components/features/task-stats.tsx`
- [X] T044 [US1] Create EmptyState component in `frontend/components/features/empty-state.tsx`
- [X] T045 [US1] Create dashboard page at `frontend/app/(dashboard)/dashboard/page.tsx`
- [X] T046 [US1] Implement task completion toggle with checkbox animation
- [X] T047 [US1] Add filter tabs (All, Pending, Completed) to dashboard
- [X] T048 [P] [US1] Add sort dropdown to dashboard
- [X] T049 [US1] Add loading skeletons during task fetching
- [X] T050 [US1] Add error handling for API failures with toast notifications

**Checkpoint**: Task list displays correctly, stats update on toggle, empty state shows when no tasks

---

## Phase 5: User Story 2 - Create and Edit Tasks (Priority: P1)

**Goal**: Create new tasks and edit existing ones via modal forms

**Independent Test**: Click FAB, fill form, submit, verify task appears in list; click edit, modify, save

**Depends on**: US1 (task list), US3 (authentication)

### Implementation for User Story 2

- [X] T051 [US2] Create TaskForm component in `frontend/components/features/task-form.tsx`
- [X] T052 [US2] Implement create task modal with slide-up animation
- [X] T053 [US2] Add character counter for title input (max 200)
- [X] T054 [US2] Implement form validation with Zod (createTaskSchema)
- [X] T055 [US2] Add loading spinner on form submit button
- [X] T056 [US2] Implement success animation on form submit
- [X] T057 [US2] Create floating action button (FAB) for task creation
- [X] T058 [US2] Implement edit task modal with pre-filled data
- [X] T059 [US2] Implement delete task with confirmation dialog
- [X] T060 [US2] Add optimistic updates for create/edit/delete
- [X] T061 [US2] Handle API errors during CRUD operations with toasts

**Checkpoint**: All 5 basic features working: Create, View, Update, Delete, Mark Complete

---

## Phase 6: User Story 4 - Theme Customization (Priority: P2)

**Goal**: Toggle between light and dark themes with preference persistence

**Independent Test**: Click theme toggle, verify smooth transition, reload page, verify preference remembered

**Depends on**: Phase 2 (design system)

### Implementation for User Story 4

- [X] T062 [US4] Create ThemeProvider in `frontend/components/providers/theme-provider.tsx`
- [X] T063 [US4] Create useTheme hook in `frontend/hooks/use-theme.ts`
- [X] T064 [US4] Create ThemeToggle component in `frontend/components/ui/theme-toggle.tsx`
- [X] T065 [US4] Add inline script in layout.tsx to prevent dark mode flash
- [X] T066 [US4] Persist theme preference to localStorage
- [X] T067 [US4] Respect system color scheme preference on first visit (prefers-color-scheme)
- [X] T068 [US4] Add smooth transition between themes (no flash)

**Checkpoint**: Theme toggle works, preference persists, no flash on page load

---

## Phase 7: User Story 5 - Command Palette (Priority: P3)

**Goal**: Power users access common actions via Cmd+K keyboard shortcut

**Independent Test**: Press Cmd+K, type "new task", select command, verify action executes

**Depends on**: US1, US2 (task operations)

### Implementation for User Story 5

- [X] T069 [US5] Create CommandPalette component in `frontend/components/features/command-palette.tsx`
- [X] T070 [US5] Implement Cmd+K (Ctrl+K on Windows) keyboard listener
- [X] T071 [US5] Add blur backdrop and slide-up animation
- [X] T072 [US5] Implement real-time command filtering as user types
- [X] T073 [US5] Add keyboard navigation (arrow keys, Enter to select)
- [X] T074 [US5] Define command actions: new task, toggle theme, logout, go to dashboard

**Checkpoint**: Command palette opens on Cmd+K, commands filter and execute correctly

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, performance, testing, deployment

**Depends on**: All user stories (US1-US5 or at minimum US1-US4)

### Accessibility (WCAG 2.1 AA)

- [X] T075 [P] Add visible focus indicators to all interactive elements
- [X] T076 [P] Verify color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI)
- [X] T077 [P] Add aria-labels and roles where needed
- [X] T078 Implement keyboard navigation for all features
- [X] T079 Add prefers-reduced-motion support to animations
- [ ] T080 Test with screen reader (VoiceOver/NVDA)
- [ ] T081 Run axe DevTools audit and fix violations

### Performance

- [X] T082 [P] Optimize images and add next/image where applicable
- [X] T083 [P] Add dynamic imports for heavy components (CommandPalette)
- [ ] T084 Run Lighthouse audit, target score >90
- [ ] T085 Verify LCP <2.5s, TTI <3.5s, CLS <0.1

### Responsive Design

- [X] T086 Test all pages on mobile (320px minimum)
- [X] T087 Implement mobile navigation (hamburger menu)
- [X] T088 Verify touch targets are minimum 44x44px
- [X] T089 Test on tablet viewport (768px)

### E2E Testing (Optional)

- [X] T090 [P] Create Playwright config in `frontend/playwright.config.ts`
- [X] T091 [P] E2E test: auth flow (register, login, logout)
- [X] T092 [P] E2E test: task CRUD operations
- [ ] T093 Run full E2E test suite

### Deployment

- [ ] T094 Configure Vercel deployment
- [ ] T095 Set production environment variables
- [ ] T096 Deploy and verify production build
- [ ] T097 Run quickstart.md validation checklist

**Checkpoint**: Production deployment live, all audits passing, responsive on all devices

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    └─> Phase 2: Foundation (Design System)
            └─> Phase 3: US3 Authentication (GATES all features)
                    ├─> Phase 4: US1 View & Manage Tasks
                    │       └─> Phase 5: US2 Create & Edit Tasks
                    └─> Phase 6: US4 Theme (can run parallel with US1)
                            └─> Phase 7: US5 Command Palette
                                    └─> Phase 8: Polish
```

### User Story Dependencies

| Story | Depends On | Can Parallelize With |
|-------|------------|---------------------|
| US3 (Auth) | Phase 2 | - |
| US1 (View) | US3 | US4 |
| US2 (Create/Edit) | US1, US3 | US4 |
| US4 (Theme) | Phase 2 | US1, US2, US3 |
| US5 (Command) | US1, US2 | - |

### Parallel Opportunities

**Setup (Phase 1)**:
```
T002, T003, T004 can run in parallel (different package.json deps)
T007, T009 can run in parallel after T006
```

**Foundation (Phase 2)**:
```
T012, T013, T014 can run in parallel (different files)
T015-T020 can run in parallel (different component files)
```

**US3 Auth**:
```
T027, T028 can run in parallel (different pages)
```

**US1 View**:
```
T048 can run parallel with T047
```

**Polish (Phase 8)**:
```
T075, T076, T077 can run in parallel (different concerns)
T082, T083 can run in parallel (different optimizations)
T090, T091, T092 can run in parallel (different tests)
```

---

## Implementation Strategy

### MVP First (P0/P1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation
3. Complete Phase 3: US3 Authentication
4. Complete Phase 4: US1 View & Manage
5. Complete Phase 5: US2 Create & Edit
6. **STOP and VALIDATE**: All 5 basic features working
7. Deploy MVP

### Incremental Delivery

| Milestone | Stories Complete | Features |
|-----------|-----------------|----------|
| M1: Auth | US3 | Login, Register, Protected Routes |
| M2: View | US3, US1 | + Task List, Stats, Toggle Complete |
| M3: CRUD | US3, US1, US2 | + Create, Edit, Delete (MVP!) |
| M4: Theme | US3, US1, US2, US4 | + Dark Mode |
| M5: Power | All | + Command Palette |
| M6: Polish | All + Phase 8 | Production Ready |

---

## Notes

- [P] tasks can run in parallel (different files, no dependencies)
- Each user story is independently testable after completion
- Commit after each task or logical group
- Stop at any checkpoint to validate progress
- P3 tasks (US5) are optional for MVP submission
- If backend unavailable, use mock API (see plan.md Risk 2)
