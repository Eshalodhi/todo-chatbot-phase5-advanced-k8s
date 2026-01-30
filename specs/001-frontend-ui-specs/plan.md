# Implementation Plan: Frontend UI Implementation

**Branch**: `001-frontend-ui-specs` | **Date**: 2026-01-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-frontend-ui-specs/spec.md`

---

## Executive Summary

**Project Scope**: Build a modern, accessible frontend for a multi-user todo application using Next.js 16+, TypeScript, Tailwind CSS, and Better Auth. The UI features glassmorphism effects, dark mode, smooth animations, and full WCAG 2.1 AA compliance.

**Key Phases**:
1. **Foundation** - Project setup, design system, atomic components
2. **Authentication** - Better Auth integration, login/register flows
3. **Core Features** - Task CRUD operations, dashboard
4. **Polish** - Testing, accessibility audit, deployment

**Success Definition**: All 5 basic features working (Create, View, Update, Delete, Mark Complete), multi-user authentication functional, responsive design, dark mode support, and WCAG 2.1 AA compliance verified.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Next.js 16+, Tailwind CSS 3.x, Framer Motion, Better Auth, React Hook Form, Zod
**Storage**: N/A (frontend consumes backend API)
**Testing**: Vitest, React Testing Library, Playwright
**Target Platform**: Web (modern browsers: Chrome, Firefox, Safari, Edge - last 2 versions)
**Project Type**: Web application (frontend within monorepo)
**Performance Goals**: LCP <2.5s, TTI <3.5s, CLS <0.1
**Constraints**: Must integrate with existing FastAPI backend, JWT auth required
**Scale/Scope**: Single-page app with 4 main routes, ~15 components, ~10 screens

---

## Constitution Check

*GATE: Must pass before implementation. All items verified against constitution v1.0.0.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Spec-Driven Development | PASS | Specifications complete before planning |
| Security First | PASS | JWT verification, user isolation via API |
| TypeScript Strict Mode | PASS | Configured in tsconfig.json |
| Server Components Default | PASS | `'use client'` only when needed |
| Responsive Design | PASS | Mobile-first with Tailwind breakpoints |
| Loading States | PASS | Skeletons and spinners specified |
| Error Handling | PASS | Toast notifications and inline errors |
| Confirmation for Destructive Actions | PASS | Delete confirmation modal |

**Constitution Violations**: None

---

## Project Structure

### Documentation (this feature)

```text
specs/001-frontend-ui-specs/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions
├── data-model.md        # TypeScript interfaces
├── quickstart.md        # Setup guide
├── contracts/           # API contracts
│   └── tasks-api.yaml   # OpenAPI spec
├── checklists/
│   └── requirements.md  # Quality checklist
├── ui/                  # UI specifications
│   ├── design-system.md
│   ├── pages.md
│   ├── components.md
│   └── animations.md
└── features/
    └── authentication.md
```

### Source Code (repository root)

```text
frontend/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth route group (unprotected)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/          # Protected route group
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Landing page
│   └── globals.css           # Global styles + design tokens
├── components/
│   ├── ui/                   # Atomic components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── checkbox.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── skeleton.tsx
│   ├── features/             # Feature components
│   │   ├── task-card.tsx
│   │   ├── task-list.tsx
│   │   ├── task-form.tsx
│   │   ├── task-stats.tsx
│   │   └── empty-state.tsx
│   ├── layout/               # Layout components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   └── providers/            # Context providers
│       ├── auth-provider.tsx
│       ├── theme-provider.tsx
│       └── toast-provider.tsx
├── lib/
│   ├── api.ts                # API client with auth
│   ├── auth.ts               # Better Auth config
│   ├── utils.ts              # Utility functions
│   └── validations.ts        # Zod schemas
├── hooks/
│   ├── use-auth.ts
│   ├── use-theme.ts
│   └── use-tasks.ts
├── types/
│   └── index.ts              # TypeScript types
├── public/                   # Static assets
├── .env.local                # Environment variables
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
└── package.json
```

**Structure Decision**: Web application structure with App Router. Route groups separate auth (public) from dashboard (protected).

---

## Phase-by-Phase Plan

### Phase 1: Foundation & Design System

**Objective**: Set up the project with all tooling, implement the design system as CSS variables, and create atomic UI components.

**Deliverables**:
- [ ] Next.js project initialized with TypeScript strict mode
- [ ] Tailwind CSS configured with design system tokens
- [ ] shadcn/ui initialized with customized theme
- [ ] Atomic components: Button, Input, Checkbox, Dialog, Toast, Skeleton
- [ ] ThemeProvider with dark mode toggle (persists to localStorage)
- [ ] Landing page with basic layout

**Key Tasks**:
1. Initialize Next.js project (see quickstart.md)
2. Install all dependencies
3. Configure TypeScript strict mode
4. Add design system CSS variables to globals.css
5. Configure Tailwind with custom colors/fonts
6. Initialize shadcn/ui and install base components
7. Create ThemeProvider with localStorage persistence
8. Create atomic UI components with all variants
9. Build landing page layout
10. Test dark mode toggle

**Dependencies**: None (first phase)

**Success Criteria**:
- `pnpm dev` starts without errors
- `pnpm tsc --noEmit` passes with zero errors
- Theme toggle switches between light/dark modes
- All atomic components render correctly
- Landing page displays with responsive layout

**Testing Approach**:
- Manual testing in browser
- Toggle dark mode, verify no flash
- Resize viewport to test responsive breakpoints
- Check console for TypeScript/React errors

---

### Phase 2: Authentication

**Objective**: Implement complete authentication flow with Better Auth, including registration, login, protected routes, and session management.

**Deliverables**:
- [ ] Better Auth configuration
- [ ] AuthProvider context
- [ ] Login page with form validation
- [ ] Register page with password strength indicator
- [ ] Protected route middleware
- [ ] User menu in header
- [ ] Logout functionality

**Key Tasks**:
1. Configure Better Auth (lib/auth.ts)
2. Create AuthProvider context
3. Create useAuth hook
4. Build login page with glassmorphism card
5. Build register page with password strength
6. Implement form validation with React Hook Form + Zod
7. Add floating label animations to inputs
8. Create protected route wrapper
9. Add auth middleware to dashboard routes
10. Build user dropdown menu in header
11. Implement logout with session cleanup
12. Add loading states during auth operations
13. Handle auth errors with toasts

**Dependencies**: Phase 1 (UI components, theme)

**Success Criteria**:
- Registration creates new user account
- Login redirects to dashboard
- Unauthenticated users redirected to login
- JWT token stored and attached to API requests
- Logout clears session and redirects to landing
- Form validation provides real-time feedback

**Testing Approach**:
- Manual auth flow testing (register → login → dashboard)
- Test invalid credentials handling
- Verify protected routes redirect correctly
- Check token storage in dev tools
- Test "Remember me" functionality

---

### Phase 3: Core Task Features

**Objective**: Implement all 5 basic task management features with the modern UI specified in the design system.

**Deliverables**:
- [ ] Dashboard layout with sidebar
- [ ] Task list with filtering and sorting
- [ ] Task cards with hover effects
- [ ] Task creation modal
- [ ] Task editing (modal or inline)
- [ ] Task deletion with confirmation
- [ ] Task completion toggle
- [ ] Stats cards with animated counters
- [ ] Empty state with illustration
- [ ] Loading skeletons

**Key Tasks**:
1. Create API client (lib/api.ts) with JWT attachment
2. Create useTasks hook for data fetching
3. Build dashboard layout (header, sidebar, main)
4. Create TaskCard component with all states
5. Create TaskList component with staggered animations
6. Create TaskStats component with counter animation
7. Create TaskForm component for create/edit
8. Implement create task flow (FAB → modal → submit)
9. Implement edit task flow (click → modal → save)
10. Implement delete with confirmation dialog
11. Implement completion toggle with checkbox animation
12. Add filter tabs (All, Pending, Completed)
13. Add sort dropdown
14. Create EmptyState component
15. Add loading skeletons for async operations
16. Add toast notifications for success/error
17. Handle API errors gracefully

**Dependencies**: Phase 2 (authentication, user context)

**Success Criteria**:
- All 5 features working: Create, View, Update, Delete, Mark Complete
- Tasks persist across page refreshes
- Stats update immediately on task changes
- Animations smooth and performant
- Error states display user-friendly messages
- Loading states show during async operations

**Testing Approach**:
- Create task, verify appears in list
- Edit task title and description
- Toggle completion, verify strikethrough
- Delete task with confirmation
- Test filter tabs and sorting
- Verify stats update correctly
- Test with slow network (DevTools throttling)
- Test with API errors (stop backend)

---

### Phase 4: Polish, Testing & Deployment

**Objective**: Finalize UI polish, run accessibility audit, fix issues, and deploy to production.

**Deliverables**:
- [ ] All animations polished
- [ ] Accessibility audit passed
- [ ] Responsive design verified
- [ ] Performance optimized
- [ ] E2E tests for critical flows
- [ ] Production deployment

**Key Tasks**:
1. Add remaining micro-interactions
2. Implement reduced motion support
3. Add focus visible indicators
4. Run axe accessibility audit
5. Fix any WCAG 2.1 AA violations
6. Test with screen reader (VoiceOver/NVDA)
7. Verify keyboard navigation
8. Test all viewport sizes (320px to 2560px)
9. Run Lighthouse performance audit
10. Optimize images and fonts
11. Add E2E tests for auth flow and task CRUD
12. Configure Vercel deployment
13. Set production environment variables
14. Deploy and verify in production

**Dependencies**: Phases 1-3 complete

**Success Criteria**:
- Lighthouse performance score >90
- Zero WCAG 2.1 AA violations
- All features work on mobile devices
- E2E tests pass
- Production deployment successful

**Testing Approach**:
- Automated: Lighthouse CI, axe-core
- Manual: Screen reader, keyboard-only navigation
- Cross-browser: Chrome, Firefox, Safari
- Cross-device: Mobile, tablet, desktop

---

## Critical Path Analysis

### Dependency Sequence

```
Phase 1 (Foundation)
    │
    ├── Design System CSS Variables
    ├── Atomic Components
    └── ThemeProvider
          │
          ▼
Phase 2 (Authentication)
    │
    ├── Better Auth Config
    ├── AuthProvider
    └── Auth Pages
          │
          ▼
Phase 3 (Core Features)
    │
    ├── API Client (depends on auth)
    ├── Dashboard Layout
    └── Task Components
          │
          ▼
Phase 4 (Polish)
    │
    ├── Accessibility Audit
    ├── E2E Tests
    └── Deployment
```

### Minimum Viable Path

For fastest path to working demo:

1. Skip advanced animations (use simple transitions)
2. Skip command palette (P3)
3. Use basic theme toggle (skip animated icon)
4. Defer inline editing (use modal only)
5. Skip virtualized list (for small task counts)

**MVP Scope**: Landing page, login, register, dashboard with basic task CRUD

### Parallel Work Opportunities

| Parallel Track A | Parallel Track B |
|------------------|------------------|
| Auth pages (login/register) | Landing page polish |
| Protected route middleware | Toast notifications |
| Dashboard layout | API client |
| Task components | Unit tests |

### Bottlenecks

1. **Better Auth configuration** - Must work before any protected routes
2. **API integration** - Frontend blocked if backend unavailable
3. **Design system** - All components depend on tokens

**Mitigation**: Use mock API data if backend delayed; finalize design tokens early

---

## Priority Matrix

### P0 - Critical (Must Have for Demo)

- [ ] Next.js project setup with TypeScript
- [ ] Basic landing page
- [ ] Login page with form validation
- [ ] Register page
- [ ] Dashboard with task list
- [ ] Create task functionality
- [ ] View tasks functionality
- [ ] Delete task functionality
- [ ] Mark complete functionality
- [ ] Basic responsive layout

### P1 - High (Required for Submission)

- [ ] Update task functionality
- [ ] Dark mode toggle
- [ ] Theme persistence
- [ ] Loading states (spinners)
- [ ] Error handling (toasts)
- [ ] Empty state
- [ ] Task stats display
- [ ] Form validation with Zod
- [ ] Protected route redirects
- [ ] Mobile navigation

### P2 - Medium (Nice to Have)

- [ ] Framer Motion animations
- [ ] Glassmorphism effects
- [ ] Staggered list entrance
- [ ] Skeleton loading states
- [ ] Animated counters
- [ ] Password strength indicator
- [ ] Task filtering (tabs)
- [ ] Task sorting

### P3 - Low (Enhancement)

- [ ] Command palette (Cmd+K)
- [ ] Inline task editing
- [ ] Drag-and-drop reordering
- [ ] Confetti on task completion
- [ ] Advanced micro-interactions
- [ ] Pull-to-refresh (mobile)
- [ ] Gesture support (swipe to delete)

---

## Risk Management

### Risk 1: Better Auth + JWT Integration

**Risk Level**: High
**Description**: Better Auth session management may not easily expose JWT for API calls

**Mitigation**:
1. Research Better Auth JWT plugin early (Phase 2, Task 1)
2. Test JWT extraction before building auth pages
3. Verify token format matches backend expectations

**Fallback**: Manual JWT generation from session if plugin unavailable

**Early Warning**: Unable to extract token after 2 hours of Phase 2

---

### Risk 2: Backend API Unavailable

**Risk Level**: Medium
**Description**: Frontend development blocked if backend not ready

**Mitigation**:
1. Create mock API responses in `lib/mock-api.ts`
2. Use MSW (Mock Service Worker) for realistic mocking
3. Define API contract (tasks-api.yaml) and code to it

**Fallback**: Continue with mock data, integrate when backend ready

**Early Warning**: Backend team reports delays

---

### Risk 3: Animation Performance

**Risk Level**: Low-Medium
**Description**: Complex animations may cause jank on mobile devices

**Mitigation**:
1. Use only `transform` and `opacity` (GPU-accelerated)
2. Test on real mobile devices early
3. Use Framer Motion's `useReducedMotion` hook
4. Profile with React DevTools Profiler

**Fallback**: Disable complex animations, use simple transitions

**Early Warning**: Frame drops visible in DevTools Performance tab

---

### Risk 4: Dark Mode Flash

**Risk Level**: Low
**Description**: Brief flash of light mode before dark mode applies

**Mitigation**:
1. Add inline script in `<head>` to check localStorage before render
2. Use `suppressHydrationWarning` on html element
3. Test with hard refresh (Cmd+Shift+R)

**Fallback**: Accept minimal flash (not blocking)

---

### Risk 5: WCAG Compliance

**Risk Level**: Medium
**Description**: May miss accessibility violations until late testing

**Mitigation**:
1. Use semantic HTML from start
2. Install axe DevTools extension during development
3. Test keyboard navigation as building components
4. Check color contrast with design system

**Fallback**: Prioritize critical violations, document known issues

---

## Setup Instructions

### Prerequisites

```bash
# Required
node --version  # Should be 18+
pnpm --version  # Or npm/yarn
```

### Step 1: Navigate to Frontend

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
pnpm install
```

Or if starting fresh:

```bash
pnpm add next react react-dom
pnpm add -D typescript @types/react @types/node
pnpm add better-auth framer-motion react-hook-form @hookform/resolvers zod
pnpm add clsx tailwind-merge lucide-react react-hot-toast
```

### Step 3: Configure Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
BETTER_AUTH_SECRET=your-shared-secret-with-backend
BETTER_AUTH_URL=http://localhost:3000/api/auth
```

### Step 4: Initialize shadcn/ui

```bash
npx shadcn@latest init
npx shadcn@latest add button input label dialog dropdown-menu avatar checkbox toast
```

### Step 5: Start Development

```bash
pnpm dev
```

### Step 6: Verify Setup

```bash
# TypeScript check
pnpm tsc --noEmit

# Lint check
pnpm lint

# Open browser
open http://localhost:3000
```

---

## Testing Strategy

### Phase 1 Testing

**Scope**: Design system and atomic components

| Test | Type | Tool |
|------|------|------|
| Components render | Manual | Browser |
| Dark mode toggle | Manual | Browser |
| Responsive layout | Manual | DevTools |
| TypeScript errors | Automated | `tsc` |

---

### Phase 2 Testing

**Scope**: Authentication flow

| Test | Type | Tool |
|------|------|------|
| Registration flow | Manual | Browser |
| Login flow | Manual | Browser |
| Invalid credentials | Manual | Browser |
| Token storage | Manual | DevTools |
| Protected routes | Manual | Browser |

**Auth Test Script**:
1. Open /register, create account
2. Verify redirect to /login
3. Login with new credentials
4. Verify redirect to /dashboard
5. Check token in localStorage/cookies
6. Refresh page, verify still logged in
7. Click logout, verify redirect to /
8. Try /dashboard, verify redirect to /login

---

### Phase 3 Testing

**Scope**: Task CRUD operations

| Test | Type | Tool |
|------|------|------|
| Create task | Manual | Browser |
| Edit task | Manual | Browser |
| Delete task | Manual | Browser |
| Toggle complete | Manual | Browser |
| Filter/sort | Manual | Browser |
| API errors | Manual | DevTools (offline) |
| Loading states | Manual | DevTools (slow 3G) |

**CRUD Test Script**:
1. Create 3 tasks with different titles
2. Verify all appear in list with correct stats
3. Edit first task title
4. Toggle second task complete
5. Verify stats update (1 completed)
6. Delete third task with confirmation
7. Verify list shows 2 tasks
8. Refresh page, verify persistence

---

### Phase 4 Testing

**Scope**: Polish and compliance

| Test | Type | Tool |
|------|------|------|
| Accessibility | Automated | axe DevTools |
| Keyboard nav | Manual | Browser |
| Screen reader | Manual | VoiceOver/NVDA |
| Performance | Automated | Lighthouse |
| Responsive | Manual | DevTools |
| E2E flows | Automated | Playwright |

---

## Backend Integration

### API Endpoints Required

From constitution and API contract:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/{user_id}/tasks` | List tasks |
| POST | `/api/{user_id}/tasks` | Create task |
| GET | `/api/{user_id}/tasks/{id}` | Get task |
| PUT | `/api/{user_id}/tasks/{id}` | Update task |
| DELETE | `/api/{user_id}/tasks/{id}` | Delete task |
| PATCH | `/api/{user_id}/tasks/{id}/complete` | Toggle complete |

### Authentication Flow

```
1. User logs in via Better Auth
2. Better Auth creates session + JWT
3. Frontend stores JWT (localStorage or httpOnly cookie)
4. Each API request includes: Authorization: Bearer <token>
5. Backend verifies token signature
6. Backend extracts user_id from token 'sub' claim
7. Backend validates URL user_id matches token user_id
8. Backend filters queries by user_id
```

### Error Handling

| Status | Meaning | Frontend Action |
|--------|---------|-----------------|
| 400 | Validation error | Show inline errors |
| 401 | Invalid/missing token | Redirect to login |
| 403 | User ID mismatch | Show "Access denied" toast |
| 404 | Task not found | Show "Not found" toast |
| 500 | Server error | Show "Server error" toast |

### Mock Data Strategy

If backend unavailable, use mock:

```typescript
// lib/mock-api.ts
const mockTasks: Task[] = [
  { id: 1, user_id: 'mock-user', title: 'Sample task', completed: false, ... },
];

export const mockApi = {
  getTasks: async () => mockTasks,
  createTask: async (data) => ({ id: Date.now(), ...data }),
  // ...
};
```

Toggle via environment variable:

```env
NEXT_PUBLIC_USE_MOCK_API=true
```

---

## Complexity Tracking

> No constitution violations. Table intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

---

## Summary

This plan provides a complete roadmap for implementing the Phase II frontend:

- **4 phases** of incremental delivery
- **Clear dependencies** and parallel opportunities
- **Priority classification** (P0-P3) for scope management
- **Risk mitigation** for known challenges
- **Testing integrated** into each phase

**Next Command**: `/sp.tasks` to generate detailed, actionable tasks from this plan.
