# Research: Frontend UI Implementation

**Feature Branch**: `001-frontend-ui-specs`
**Date**: 2026-01-01
**Status**: Complete

---

## Research Summary

This document captures all technical decisions and research findings for the Phase II frontend implementation. All items previously marked as "NEEDS CLARIFICATION" have been resolved.

---

## 1. Authentication Integration

### Decision: Better Auth with JWT Extraction

**Rationale**: The constitution mandates Better Auth for frontend authentication with JWT tokens for API calls. Better Auth handles session management, while the frontend extracts JWT tokens for backend API authentication.

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Better Auth only | Simple setup, handles sessions | Cannot authenticate with separate FastAPI backend | Rejected |
| Custom JWT implementation | Full control | Reinvents wheel, security risk | Rejected |
| Better Auth + JWT extraction | Best of both, constitution-compliant | Slightly more setup | **Selected** |

**Implementation Approach**:
1. Better Auth handles login/register flows
2. On successful auth, Better Auth creates session + JWT
3. Frontend stores JWT and attaches to API requests via `Authorization: Bearer <token>`
4. Backend verifies JWT signature with shared `BETTER_AUTH_SECRET`

---

## 2. State Management

### Decision: React Server Components + Context for Client State

**Rationale**: Next.js App Router encourages Server Components by default. Client state (auth, theme, toasts) uses lightweight React Context instead of Redux/Zustand to minimize bundle size.

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Redux Toolkit | Powerful, familiar | Overkill for small app, large bundle | Rejected |
| Zustand | Lightweight, simple | Another dependency | Rejected |
| React Context + hooks | Built-in, zero deps, sufficient for scope | Prop drilling if overused | **Selected** |
| TanStack Query | Great for server state | May add complexity | Consider for API caching |

**Implementation Approach**:
1. Server Components for data fetching (dashboard, task list)
2. AuthContext for user session state
3. ThemeContext for dark mode toggle
4. ToastContext for notification management
5. Consider TanStack Query for API caching if needed

---

## 3. Animation Library

### Decision: Framer Motion for Complex, Tailwind for Simple

**Rationale**: Framer Motion provides declarative animations with excellent React integration. Tailwind handles simple transitions (hover, focus) without additional bundle size.

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| CSS only | Smallest bundle | Limited, verbose for complex animations | Partial use |
| Framer Motion | Declarative, layout animations, gestures | ~30kb bundle | **Selected** for complex |
| React Spring | Physics-based | Steeper learning curve | Rejected |
| GSAP | Powerful | Large bundle, overkill | Rejected |

**Implementation Approach**:
1. Tailwind `transition-*` for hover/focus states
2. Framer Motion for: modals, page transitions, staggered lists
3. Use `AnimatePresence` for exit animations
4. Respect `prefers-reduced-motion` via `useReducedMotion` hook

---

## 4. Form Handling

### Decision: React Hook Form + Zod

**Rationale**: React Hook Form provides performant form handling with minimal re-renders. Zod provides type-safe validation that integrates well with TypeScript.

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Controlled inputs | Simple, no deps | Re-renders on every keystroke | Rejected |
| Formik | Popular | Larger bundle, more boilerplate | Rejected |
| React Hook Form | Performant, minimal re-renders | Learning curve | **Selected** |
| React Hook Form + Zod | Type-safe validation | Extra dep (small) | **Selected** |

**Implementation Approach**:
1. React Hook Form for form state
2. Zod schemas for validation (matches API contracts)
3. `@hookform/resolvers/zod` for integration
4. Floating labels and character counts via custom components

---

## 5. UI Component Library

### Decision: Build on shadcn/ui Primitives

**Rationale**: shadcn/ui provides accessible, unstyled components via Radix UI primitives. Components are copied into the project (not npm dependency), allowing full customization to match design system.

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Build from scratch | Full control | Time-consuming, accessibility challenges | Rejected |
| MUI (Material UI) | Complete, familiar | Opinionated styling, large bundle | Rejected |
| Chakra UI | Accessible, composable | Its own design system | Rejected |
| shadcn/ui | Accessible, customizable, copy-paste | Not a package (feature, not bug) | **Selected** |

**Implementation Approach**:
1. Initialize shadcn/ui in project
2. Install needed components: Button, Input, Dialog, Toast, etc.
3. Customize to match design system colors/tokens
4. Add Framer Motion for enhanced animations

---

## 6. API Client

### Decision: Native Fetch with Custom Wrapper

**Rationale**: Native fetch is sufficient for this scope. A thin wrapper handles token attachment and error normalization without adding dependencies.

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Axios | Popular, interceptors | Extra dependency, larger bundle | Rejected |
| Native fetch | Zero deps, sufficient | More boilerplate | **Selected** |
| TanStack Query | Caching, deduplication | May add complexity | Consider for Phase II+ |
| SWR | Lightweight caching | Vercel-specific patterns | Consider |

**Implementation Approach**:
1. Create `lib/api.ts` with typed API client
2. Attach JWT from localStorage/cookie
3. Handle 401 (redirect to login), 403 (forbidden), 500 (error toast)
4. Return typed responses matching Zod schemas

---

## 7. Toast Notifications

### Decision: react-hot-toast

**Rationale**: Lightweight (~3kb), great API, highly customizable. Better than building from scratch for hackathon timeline.

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Build custom | Full control | Time cost, accessibility | Rejected |
| react-toastify | Feature-rich | Larger bundle, styling overhead | Rejected |
| react-hot-toast | Lightweight, simple API, customizable | Fewer features | **Selected** |
| sonner | Modern, beautiful | Less customizable | Alternative |

---

## 8. Dark Mode Implementation

### Decision: Tailwind dark: + localStorage + System Preference

**Rationale**: Tailwind's dark mode with `class` strategy allows full control. Persist to localStorage and respect system preference on first visit.

**Implementation Approach**:
1. Configure Tailwind with `darkMode: 'class'`
2. Create ThemeProvider that:
   - Reads preference from localStorage on mount
   - Falls back to system preference (`prefers-color-scheme`)
   - Toggles `dark` class on `<html>` element
3. Add inline script in `<head>` to prevent flash
4. Smooth transition on theme change

---

## 9. Testing Strategy

### Decision: Vitest + React Testing Library + Playwright

**Rationale**: Vitest is fast and compatible with Vite/Next.js. React Testing Library for component tests. Playwright for E2E tests of critical flows.

**Alternatives Considered**:
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Jest | Popular, stable | Slower, complex config with Next.js | Rejected |
| Vitest | Fast, modern, ESM-native | Newer | **Selected** |
| Cypress | Great DX | Slower than Playwright | Rejected |
| Playwright | Fast, multi-browser | More complex setup | **Selected** for E2E |

**Implementation Approach**:
1. Vitest for unit/component tests
2. React Testing Library for component interaction tests
3. Playwright for E2E tests (auth flow, task CRUD)
4. Focus on critical paths, not 100% coverage

---

## 10. Deployment

### Decision: Vercel (Frontend)

**Rationale**: Vercel is the native platform for Next.js. Zero-config deployment, automatic previews, edge functions if needed.

**Environment Variables**:
- `NEXT_PUBLIC_API_URL`: Backend URL (e.g., `https://api.example.com`)
- `BETTER_AUTH_SECRET`: JWT signing secret (MUST match backend)
- `BETTER_AUTH_URL`: Auth endpoint URL

---

## 11. Monorepo Structure

### Decision: Separate frontend/ Directory

**Rationale**: Constitution specifies monorepo with `frontend/`, `backend/`, `specs/` structure. Frontend is self-contained Next.js project.

**Final Structure**:
```
frontend/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth route group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/          # Protected route group
│   │   └── dashboard/
│   ├── layout.tsx
│   ├── page.tsx              # Landing page
│   └── globals.css
├── components/
│   ├── ui/                   # Atomic components
│   ├── features/             # Feature components
│   ├── layout/               # Layout components
│   └── providers/            # Context providers
├── lib/
│   ├── api.ts                # API client
│   ├── auth.ts               # Better Auth config
│   ├── utils.ts              # Utilities (cn, etc.)
│   └── validations.ts        # Zod schemas
├── hooks/                    # Custom hooks
├── types/                    # TypeScript types
├── public/                   # Static assets
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
└── package.json
```

---

## Resolved Clarifications

All technical decisions have been made. No outstanding clarifications needed.

| Item | Resolution | Reference |
|------|------------|-----------|
| Auth method | Better Auth + JWT | Section 1 |
| State management | React Context | Section 2 |
| Animation library | Framer Motion + Tailwind | Section 3 |
| Form library | React Hook Form + Zod | Section 4 |
| Component library | shadcn/ui | Section 5 |
| API client | Native fetch wrapper | Section 6 |
| Toast library | react-hot-toast | Section 7 |
| Dark mode | Tailwind class strategy | Section 8 |
| Testing | Vitest + RTL + Playwright | Section 9 |
| Deployment | Vercel | Section 10 |
