# Pages Specification

**Feature Branch**: `001-frontend-ui-specs`
**Created**: 2026-01-01
**Status**: Draft

---

## Overview

This document specifies all pages in the todo application, including layout structure, component composition, animations, states, and responsive behavior.

---

## 1. Landing Page (/)

### Purpose
Public marketing page to attract new users and communicate the value proposition of the task management application.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (glassmorphism navbar)                               │
│  Logo    [Features] [Pricing] [Login] [Get Started →]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                      HERO SECTION                           │
│              Gradient mesh background                       │
│                                                             │
│           "Manage tasks with elegance"                      │
│         (Animated headline with gradient text)              │
│                                                             │
│         "The beautiful, modern way to organize..."          │
│               (Fade-in subheadline)                         │
│                                                             │
│     [Get Started Free]    [See Demo]                        │
│     (Primary CTA)         (Secondary CTA)                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    FEATURES SECTION                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Icon      │  │   Icon      │  │   Icon      │         │
│  │ Feature 1   │  │ Feature 2   │  │ Feature 3   │         │
│  │ Description │  │ Description │  │ Description │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         (Staggered fade-in on scroll)                       │
├─────────────────────────────────────────────────────────────┤
│                  TESTIMONIALS SECTION                       │
│         (Optional: Social proof carousel)                   │
├─────────────────────────────────────────────────────────────┤
│                         FOOTER                              │
│  Logo   Links   Social   Copyright                          │
└─────────────────────────────────────────────────────────────┘
```

### Component Composition

| Section | Components | Animation |
|---------|------------|-----------|
| Header | Logo, NavLinks, ThemeToggle, Button (x2) | Glassmorphism with backdrop-blur |
| Hero | Heading, Subheading, Button (x2) | Gradient text animation, staggered fade-in |
| Features | FeatureCard (x3) | Scroll-triggered staggered entrance |
| Footer | Logo, LinkGroup (x3), SocialLinks | Fade-in on scroll |

### Animation Sequences

1. **Page Load**:
   - Header fades in (duration-300)
   - Hero headline animates character-by-character or word-by-word (duration-700)
   - Subheadline fades in with delay-200
   - CTA buttons slide up with delay-400

2. **Scroll Animations**:
   - Features section: Each card fades in with translateY(20px) → translateY(0), staggered 100ms
   - Footer: Simple fade-in when entering viewport

### States

| State | Visual Treatment |
|-------|------------------|
| Default | Full content visible |
| Loading | Not applicable (static page) |
| Mobile menu open | Full-screen overlay with slide-in navigation |

### Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| Mobile (<640px) | Hamburger menu, single-column features, stacked CTAs |
| Tablet (640-1024px) | 2-column features grid |
| Desktop (>1024px) | 3-column features, horizontal navigation |

### Dark Mode Variations

- Background: Gradient mesh uses darker color stops
- Cards: neutral-100 → neutral-800 background
- Text: Inverted contrast ratios
- Shadows: Reduced opacity, subtle glow effects

---

## 2. Login Page (/login)

### Purpose
Authenticate existing users and provide path to registration.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│           GRADIENT MESH BACKGROUND (animated)               │
│                                                             │
│              ┌─────────────────────────┐                    │
│              │   GLASSMORPHISM CARD    │                    │
│              │                         │                    │
│              │       [App Logo]        │                    │
│              │   "Welcome back"        │                    │
│              │                         │                    │
│              │   ┌─────────────────┐   │                    │
│              │   │ Email           │   │ ← Floating label   │
│              │   └─────────────────┘   │                    │
│              │                         │                    │
│              │   ┌─────────────────┐   │                    │
│              │   │ Password    [👁] │   │ ← Show/hide toggle│
│              │   └─────────────────┘   │                    │
│              │                         │                    │
│              │   ☐ Remember me         │                    │
│              │         [Forgot password?]                   │
│              │                         │                    │
│              │   ┌─────────────────┐   │                    │
│              │   │    Sign In      │   │ ← Loading state    │
│              │   └─────────────────┘   │                    │
│              │                         │                    │
│              │   ──── or continue with ────                 │
│              │                         │                    │
│              │   [Google] [GitHub]     │ ← Social auth      │
│              │                         │                    │
│              │   Don't have an account? │                   │
│              │         [Sign up]        │                   │
│              └─────────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Composition

| Element | Component | Props/Behavior |
|---------|-----------|----------------|
| Card container | Card | glassmorphism, rounded-2xl, shadow-xl |
| Logo | Image | Centered, 48px height |
| Heading | Heading | text-2xl, font-semibold, neutral-900 |
| Email field | Input | type=email, floating label, validation |
| Password field | Input | type=password, floating label, show/hide toggle |
| Remember me | Checkbox | Custom animated checkbox |
| Forgot link | Link | Opens modal or navigates to /forgot-password |
| Submit button | Button | variant=primary, full-width, loading state |
| Divider | Divider | "or continue with" text |
| Social buttons | Button | variant=outline, icon-leading |
| Sign up link | Link | Navigates to /register |

### Animation Sequences

1. **Page Entry**:
   - Background gradient animates slowly (infinite, subtle movement)
   - Card fades in + slides up from translateY(20px), duration-500

2. **Input Focus**:
   - Label floats up with scale(0.85) + translateY(-100%), duration-200
   - Border color transitions to primary-500
   - Subtle glow ring appears

3. **Form Submission**:
   - Button text fades out, spinner fades in
   - On success: Checkmark animation, then redirect
   - On error: Card shake animation (translateX oscillation), error toast

4. **Error States**:
   - Input border turns error-500
   - Error message slides in below input, opacity 0→1
   - Shake animation: translateX(0) → 4px → -4px → 4px → 0, duration-300

### States

| State | Visual Treatment |
|-------|------------------|
| Default | Empty form, all inputs neutral |
| Input focused | Floating label, focus ring, highlighted border |
| Input filled | Floating label persists, neutral border |
| Input error | Red border, error message below, shake on submit |
| Submitting | Button shows spinner, inputs disabled |
| Success | Checkmark animation, brief pause, redirect |
| Error | Toast notification, form remains editable |

### Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| Mobile (<640px) | Card fills width with 16px margins, reduced padding |
| Tablet+ (≥640px) | Card max-width 400px, centered |

### Dark Mode Variations

- Background: Darker gradient mesh colors
- Card: rgba(0,0,0,0.5) with white/10% border
- Inputs: Dark background, light text, subtle borders
- Focus rings: Increased brightness for visibility

---

## 3. Register Page (/register)

### Purpose
Create new user accounts with a delightful onboarding experience.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│           GRADIENT MESH BACKGROUND (animated)               │
│                                                             │
│              ┌─────────────────────────┐                    │
│              │   GLASSMORPHISM CARD    │                    │
│              │                         │                    │
│              │       [App Logo]        │                    │
│              │   "Create your account" │                    │
│              │                         │                    │
│              │   ┌─────────────────┐   │                    │
│              │   │ Full Name       │   │                    │
│              │   └─────────────────┘   │                    │
│              │                         │                    │
│              │   ┌─────────────────┐   │                    │
│              │   │ Email           │   │ ← Real-time check  │
│              │   └─────────────────┘   │                    │
│              │                         │                    │
│              │   ┌─────────────────┐   │                    │
│              │   │ Password    [👁] │   │                    │
│              │   └─────────────────┘   │                    │
│              │   [═══════░░░░] Strong  │ ← Strength meter   │
│              │                         │                    │
│              │   ┌─────────────────┐   │                    │
│              │   │ Confirm Password│   │                    │
│              │   └─────────────────┘   │                    │
│              │                         │                    │
│              │   ☐ I agree to Terms    │                    │
│              │                         │                    │
│              │   ┌─────────────────┐   │                    │
│              │   │  Create Account │   │                    │
│              │   └─────────────────┘   │                    │
│              │                         │                    │
│              │   Already have an account?                   │
│              │         [Sign in]        │                   │
│              └─────────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Composition

| Element | Component | Props/Behavior |
|---------|-----------|----------------|
| Name field | Input | floating label, min 2 chars |
| Email field | Input | floating label, real-time availability check |
| Password field | Input | floating label, show/hide, strength indicator |
| Strength meter | ProgressBar | 4 segments (weak/fair/good/strong), color-coded |
| Confirm field | Input | floating label, match validation |
| Terms checkbox | Checkbox | Required, links to Terms page |
| Submit button | Button | variant=primary, loading state |

### Password Strength Indicator

| Level | Color | Criteria |
|-------|-------|----------|
| Weak | error-500 | <6 chars or common password |
| Fair | warning-500 | 6-7 chars, 1 character type |
| Good | info-500 | 8+ chars, 2 character types |
| Strong | success-500 | 8+ chars, 3+ character types (upper, lower, number, symbol) |

### Animation Sequences

1. **Page Entry**: Same as Login page
2. **Password Strength**: Meter segments fill with color transition, duration-200
3. **Email Check**:
   - Debounced 300ms after typing stops
   - Spinner appears in input trailing position
   - Success: Green checkmark
   - Taken: Red X with error message

4. **Success Flow**:
   - Button transforms to checkmark
   - Confetti animation (optional, subtle)
   - Card fades out, success message fades in
   - Auto-redirect to login with toast

### States

Same as Login page, plus:

| State | Visual Treatment |
|-------|------------------|
| Email checking | Spinner in input |
| Email available | Green checkmark icon |
| Email taken | Red X, error message |
| Passwords match | Green checkmark on confirm field |
| Passwords mismatch | Error message on confirm field |

### Responsive Breakpoints

Same as Login page.

---

## 4. Dashboard Page (/dashboard)

### Purpose
Primary workspace for authenticated users to manage their tasks.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (glassmorphism, sticky)                       z-20   │
│  ☰ │ Logo │           [Search...]           │ 🌙 │ [Avatar]│
├────┬────────────────────────────────────────────────────────┤
│    │                                                        │
│ S  │  MAIN CONTENT                                          │
│ I  │                                                        │
│ D  │  ┌──────────────────────────────────────────────────┐ │
│ E  │  │ STATS ROW                                        │ │
│ B  │  │ ┌─────────┐ ┌─────────┐ ┌─────────┐              │ │
│ A  │  │ │ Total   │ │ Pending │ │ Done    │              │ │
│ R  │  │ │   12    │ │    5    │ │    7    │              │ │
│    │  │ └─────────┘ └─────────┘ └─────────┘              │ │
│    │  └──────────────────────────────────────────────────┘ │
│ 📋 │                                                        │
│ ⚙️ │  ┌──────────────────────────────────────────────────┐ │
│    │  │ TASK LIST HEADER                                 │ │
│    │  │ [All ✓] [Pending] [Completed]  [Sort ▼]          │ │
│    │  └──────────────────────────────────────────────────┘ │
│    │                                                        │
│    │  ┌──────────────────────────────────────────────────┐ │
│    │  │ ☐ Task 1 title                    [Edit] [Delete]│ │
│    │  │   Task 1 description preview...                  │ │
│    │  └──────────────────────────────────────────────────┘ │
│    │  ┌──────────────────────────────────────────────────┐ │
│    │  │ ☑ Task 2 title (completed)        [Edit] [Delete]│ │
│    │  │   Task 2 description preview...                  │ │
│    │  └──────────────────────────────────────────────────┘ │
│    │                                                        │
│    │                      ⋮                                │
│    │                                                        │
│    │                                              [+ Add]  │ ← FAB
│    │                                                        │
└────┴────────────────────────────────────────────────────────┘

COMMAND PALETTE (Cmd+K) - overlay z-80
┌──────────────────────────────────────┐
│ [🔍 Type a command or search...]     │
│ ─────────────────────────────────────│
│ 📝 Create new task                   │
│ 🔍 Search tasks                      │
│ 🌙 Toggle dark mode                  │
│ 👤 Profile settings                  │
│ 🚪 Logout                            │
└──────────────────────────────────────┘
```

### Component Composition

| Section | Components |
|---------|------------|
| Header | Logo, SearchInput, ThemeToggle, Avatar, UserDropdown |
| Sidebar | NavItem (Dashboard, Settings), collapsible on mobile |
| Stats Row | StatCard (x3) with animated counters |
| Task Controls | FilterTabs, SortDropdown |
| Task List | TaskCard (multiple), EmptyState (when no tasks) |
| FAB | Button (floating, primary, icon=plus) |
| Command Palette | CommandPalette (modal, fuzzy search) |

### Header Behavior

- Sticky positioning with z-20
- Glassmorphism effect (backdrop-blur-lg)
- Search bar: Expands on focus (mobile), shows Cmd+K shortcut
- Avatar: Opens dropdown with profile, settings, logout

### Sidebar Behavior

| Viewport | Behavior |
|----------|----------|
| Mobile (<768px) | Hidden, hamburger menu opens full-screen overlay |
| Tablet (768-1024px) | Collapsed (icons only), hover to expand |
| Desktop (>1024px) | Expanded by default, collapsible via toggle |

### Stats Cards

- Display: Total tasks, Pending tasks, Completed tasks
- Animation: Numbers count up from 0 on page load (duration-500)
- Color coding: Neutral, warning (pending), success (completed)

### Task List

- Filter tabs with animated underline indicator
- Sort dropdown: By date, alphabetical, status
- Empty state: Illustration + "No tasks yet" + CTA button
- Staggered entrance animation for task cards

### Animation Sequences

1. **Page Load**:
   - Header slides down from top, duration-300
   - Sidebar slides in from left (desktop), duration-300
   - Stats cards fade in + count up numbers
   - Task list: Staggered fade-in, 50ms delay between cards

2. **Task Interactions**:
   - Checkbox: Check animation with scale + color change
   - Card hover: Elevation increase (shadow-md → shadow-lg), subtle scale(1.01)
   - Action buttons: Fade in on card hover

3. **Command Palette**:
   - Backdrop fades in with blur
   - Modal slides down + fades in, duration-200, ease-spring
   - Results filter in real-time

### States

| State | Visual Treatment |
|-------|------------------|
| Loading | Skeleton placeholders for stats and task cards |
| Empty (no tasks) | Illustration, helpful message, CTA button |
| Error | Error banner at top, retry button |
| Filtering | Active tab highlighted, list animates to filtered state |
| Searching | Results update live as user types |

### Empty State Design

- Illustration: Simple, friendly SVG (checkbox character or task icons)
- Headline: "No tasks yet"
- Subtext: "Create your first task to get started"
- CTA: Primary button "Create Task"

### Loading Skeleton Design

- Stats: 3 skeleton cards with shimmer
- Tasks: 3-5 skeleton task cards with shimmer
- Maintains layout to prevent CLS (Cumulative Layout Shift)

### Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| Mobile (<768px) | Sidebar hidden, hamburger menu, stacked stats, FAB visible |
| Tablet (768-1024px) | Collapsed sidebar, 2-column stats |
| Desktop (>1024px) | Full sidebar, 3-column stats, inline add button option |

### Dark Mode Variations

- Background: neutral-900 with subtle gradient
- Cards: neutral-800 background, neutral-700 borders
- Stats: Adjusted semantic colors for dark backgrounds
- Sidebar: Darker background, highlighted active item

---

## Shared Page Elements

### Global Loading State

- Full-page skeleton or progress bar at top
- Smooth transition when content loads

### Global Error Handling

- Toast notifications for transient errors
- Error banners for page-level errors with retry action

### Page Transitions

- Fade transition between routes, duration-200
- Maintain scroll position appropriately

### Accessibility Across All Pages

- Skip to main content link
- Proper heading hierarchy (h1 → h2 → h3)
- Focus management on route changes
- ARIA live regions for dynamic content updates
