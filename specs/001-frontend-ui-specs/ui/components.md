# Components Specification

**Feature Branch**: `001-frontend-ui-specs`
**Created**: 2026-01-01
**Status**: Draft

---

## Overview

This document specifies all reusable UI components for the todo application, including their variants, states, animations, and accessibility requirements.

---

## Atomic Components (Atoms)

### 1. Button Component

**Purpose**: Primary interactive element for user actions.

#### Variants

| Variant | Background | Text | Border | Usage |
|---------|------------|------|--------|-------|
| `primary` | primary-500 | white | none | Primary actions (Submit, Save) |
| `secondary` | secondary-500 | white | none | Secondary actions |
| `outline` | transparent | primary-500 | primary-500 | Tertiary actions |
| `ghost` | transparent | neutral-700 | none | Minimal actions |
| `danger` | error-500 | white | none | Destructive actions |

#### Sizes

| Size | Height | Padding X | Font Size | Icon Size |
|------|--------|-----------|-----------|-----------|
| `sm` | 32px | 12px | text-sm | 16px |
| `md` | 40px | 16px | text-sm | 20px |
| `lg` | 48px | 24px | text-base | 24px |

#### States

| State | Visual Changes |
|-------|----------------|
| Default | Base variant styles |
| Hover | Brightness +10%, scale(1.02), shadow increase |
| Active/Pressed | Brightness -10%, scale(0.98) |
| Focus | 2px focus ring (primary-500), offset 2px |
| Disabled | opacity 0.5, cursor not-allowed, no hover effects |
| Loading | Text hidden, spinner visible, disabled state |

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | string | 'primary' | Visual variant |
| `size` | string | 'md' | Size variant |
| `disabled` | boolean | false | Disable interactions |
| `loading` | boolean | false | Show loading spinner |
| `iconLeading` | ReactNode | null | Icon before text |
| `iconTrailing` | ReactNode | null | Icon after text |
| `fullWidth` | boolean | false | Stretch to container width |

#### Animations

- Hover: `transition: all 150ms ease-out`
- Press: `transition: transform 100ms ease-in`
- Loading spinner: Rotate 360deg, duration-1000, linear, infinite

#### Accessibility

- Use `<button>` element (not div/span)
- `aria-disabled` when disabled
- `aria-busy="true"` when loading
- Visible focus ring meeting 3:1 contrast

---

### 2. Input Component

**Purpose**: Text input with floating label and validation states.

#### Structure

```
┌─────────────────────────────────────┐
│ [Icon]  Label (floating)    [Clear] │
│         ________________________    │
│        |User input text...     |    │
│        |________________________|    │
│ Helper text or error message        │
└─────────────────────────────────────┘
```

#### States

| State | Label | Border | Background | Helper |
|-------|-------|--------|------------|--------|
| Empty/Unfocused | Inside input, neutral-400 | neutral-300 | neutral-0 | Neutral helper |
| Focused | Floated, primary-500 | primary-500 | neutral-0 | Neutral helper |
| Filled/Unfocused | Floated, neutral-500 | neutral-300 | neutral-0 | Neutral helper |
| Error | Floated, error-500 | error-500 | error-50 | Error message |
| Success | Floated, success-500 | success-500 | success-50 | Success message |
| Disabled | Floated, neutral-400 | neutral-200 | neutral-100 | Grayed out |

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | string | 'text' | Input type (text, email, password) |
| `label` | string | required | Floating label text |
| `placeholder` | string | '' | Placeholder when label floated |
| `error` | string | null | Error message to display |
| `success` | string | null | Success message to display |
| `helperText` | string | null | Helper text below input |
| `iconLeading` | ReactNode | null | Left icon |
| `iconTrailing` | ReactNode | null | Right icon (or show/hide for password) |
| `clearable` | boolean | false | Show X button when filled |
| `disabled` | boolean | false | Disable input |

#### Animations

- Label float: `transform: translateY(-100%) scale(0.85)`, duration-200, ease-out
- Border color: `transition: border-color 150ms ease`
- Focus ring: `transition: box-shadow 150ms ease`
- Error shake: `translateX: 0 → 4px → -4px → 4px → 0`, duration-300
- Clear button: Fade in on input filled

#### Accessibility

- Use `<label>` associated with input via `htmlFor`
- `aria-invalid="true"` when error
- `aria-describedby` linking to error/helper text
- Clear button: `aria-label="Clear input"`

---

### 3. Checkbox Component

**Purpose**: Toggle boolean states with animated checkmark.

#### Structure

```
┌──┐
│✓ │ Label text
└──┘
```

#### States

| State | Box | Checkmark | Label |
|-------|-----|-----------|-------|
| Unchecked | neutral-200 border, transparent bg | Hidden | neutral-700 |
| Checked | primary-500 bg | White, animated draw | neutral-900 |
| Hover (unchecked) | primary-100 bg | Hidden | neutral-900 |
| Hover (checked) | primary-600 bg | White | neutral-900 |
| Disabled | neutral-200 bg | neutral-400 | neutral-400 |
| Focus | 2px focus ring | - | - |

#### Animations

- Check: SVG path draws from 0% to 100% stroke-dashoffset, duration-200
- Uncheck: Reverse animation, duration-150
- Background: Color transition, duration-150

#### Accessibility

- Use native `<input type="checkbox">` with custom styling
- Properly associated label
- Focus visible on keyboard navigation

---

### 4. Toggle/Switch Component

**Purpose**: Binary toggle with sliding animation.

#### Structure

```
Unchecked: [○        ] Label
Checked:   [        ●] Label
```

#### Dimensions

- Track: 44px wide, 24px tall, rounded-full
- Knob: 20px diameter, 2px inset

#### States

Similar to Checkbox with sliding knob animation.

#### Animations

- Knob slide: `translateX(0) → translateX(20px)`, duration-200, ease-spring
- Track color: Fade from neutral-300 to primary-500, duration-200

---

### 5. Avatar Component

**Purpose**: Display user profile image or initials.

#### Variants

| Size | Dimensions | Font Size |
|------|------------|-----------|
| `xs` | 24px | text-xs |
| `sm` | 32px | text-sm |
| `md` | 40px | text-base |
| `lg` | 48px | text-lg |
| `xl` | 64px | text-xl |

#### Fallback Behavior

1. Show `src` image if provided and loads
2. On error, show initials from `name` prop
3. If no name, show generic user icon

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `src` | string | Image URL |
| `name` | string | User name for initials fallback |
| `size` | string | Size variant |
| `status` | string | Optional: 'online', 'away', 'busy' |

---

## Molecule Components

### 6. Task Card Component

**Purpose**: Display individual task with actions and status.

#### Structure

```
┌────────────────────────────────────────────────────────────┐
│ ☐ Task title here...                        [✏️] [🗑️] │
│   Description preview text that might be truncated...     │
│   ─────────────────────────────────────────────────────    │
│   Created: Jan 1, 2026                                     │
└────────────────────────────────────────────────────────────┘
```

#### Visual Specifications

| Element | Specification |
|---------|--------------|
| Card | padding-4, rounded-lg, shadow-sm, neutral-0 bg |
| Checkbox | 20px, aligned with title |
| Title | text-base, font-medium, truncate with ellipsis |
| Description | text-sm, neutral-500, 2-line clamp |
| Actions | Icon buttons, 32px touch target |
| Completed state | Title strikethrough, opacity 0.6 |

#### States

| State | Visual Changes |
|-------|----------------|
| Default | shadow-sm, neutral-0 bg |
| Hover | shadow-md, scale(1.01), action buttons visible |
| Completed | Strikethrough title, reduced opacity |
| Editing | Inline inputs replace static text |
| Deleting | Slide out animation before removal |
| Dragging | shadow-xl, scale(1.02), reduced opacity on original position |

#### Animations

- Entrance: Fade in + slide up, duration-300, staggered
- Hover elevation: shadow transition, duration-150
- Check completion: Checkmark draw + confetti burst (optional)
- Delete: Slide right + fade out, duration-200
- Action buttons: Fade in on hover, duration-150

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `task` | Task | Task data object |
| `onToggle` | function | Completion toggle handler |
| `onEdit` | function | Edit handler |
| `onDelete` | function | Delete handler |
| `isEditing` | boolean | Enable inline edit mode |

#### Accessibility

- Card is focusable via Tab
- Checkbox has proper label (task title)
- Action buttons have aria-labels
- Delete requires confirmation

---

### 7. Task List Component

**Purpose**: Container for task cards with filtering and animations.

#### Structure

```
┌──────────────────────────────────────────────────────────┐
│ [All] [Pending] [Completed]                [Sort: ▼ Date]│
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Task Card 1                                          │ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Task Card 2                                          │ │
│ └──────────────────────────────────────────────────────┘ │
│                         ⋮                                │
└──────────────────────────────────────────────────────────┘
```

#### Filter Tabs

- Animated underline indicator follows active tab
- Tab: padding-x-4, padding-y-2
- Active: primary-500 text, underline
- Inactive: neutral-500 text

#### Sort Dropdown

- Options: Date (newest), Date (oldest), Alphabetical, Status
- Dropdown animation: Slide down + fade in

#### Empty State

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                    [Illustration]                        │
│                                                          │
│                    No tasks yet                          │
│           Create your first task to get started          │
│                                                          │
│                   [+ Create Task]                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Animations

- Card stagger: Each card enters 50ms after previous
- Filter transition: Cards fade out → reorder → fade in
- Reorder: Smooth FLIP animation when sorting changes

#### Performance

- Virtualize list if >50 tasks visible
- Memoize individual task cards
- Debounce filter/sort operations

---

### 8. Task Form Component

**Purpose**: Create or edit tasks with validation.

#### Structure (Modal or Inline)

```
┌──────────────────────────────────────────────────────────┐
│ Create New Task                                    [✕]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Title *                                         120/200  │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Enter task title...                                  │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ Description                                     0/1000   │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Enter task description...                            │ │
│ │                                                      │ │
│ │                                                      │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│                           [Cancel]  [Create Task]        │
└──────────────────────────────────────────────────────────┘
```

#### Validation

| Field | Rules | Error Message |
|-------|-------|---------------|
| Title | Required, 1-200 chars | "Title is required" / "Title must be under 200 characters" |
| Description | Optional, max 1000 chars | "Description must be under 1000 characters" |

#### Features

- Character count: Shows current/max, turns red at limit
- Auto-resize textarea: Grows with content, max 200px
- Keyboard shortcuts: Enter to submit, Esc to cancel
- Loading state: Button shows spinner during submission

#### Animations

- Modal entry: Slide up + fade in, duration-300
- Input focus: Border color transition
- Submit success: Checkmark + close animation
- Error: Shake animation on submit button

---

### 9. Header Component

**Purpose**: Global navigation and user controls.

#### Structure

```
┌─────────────────────────────────────────────────────────────┐
│ [☰] [Logo] │        [🔍 Search...  ⌘K]        │ [🌙] [👤▼] │
└─────────────────────────────────────────────────────────────┘
```

#### Sub-components

| Element | Behavior |
|---------|----------|
| Hamburger (mobile) | Opens sidebar overlay |
| Logo | Links to dashboard |
| Search | Focus shows expanded state, Cmd+K opens command palette |
| Theme toggle | Smooth icon morph between sun/moon |
| User menu | Dropdown with profile, settings, logout |

#### User Dropdown Menu

```
┌────────────────────────┐
│ 👤 User Name           │
│ user@email.com         │
├────────────────────────┤
│ 👤 Profile             │
│ ⚙️ Settings            │
├────────────────────────┤
│ 🚪 Logout              │
└────────────────────────┘
```

#### Animations

- Dropdown: Fade in + slide down, duration-200
- Search expand (mobile): Width transition
- Theme toggle: Icon rotates + morphs

---

### 10. Modal/Dialog Component

**Purpose**: Overlay for focused interactions.

#### Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKDROP (blur)                          │
│    ┌──────────────────────────────────────────────────┐     │
│    │ Modal Title                               [✕]    │     │
│    ├──────────────────────────────────────────────────┤     │
│    │                                                  │     │
│    │ Modal content goes here...                       │     │
│    │                                                  │     │
│    ├──────────────────────────────────────────────────┤     │
│    │                      [Cancel]  [Confirm]         │     │
│    └──────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Behavior

- Close on: Backdrop click, Esc key, X button
- Focus trap: Tab cycles within modal
- Scroll lock: Body scroll disabled when open
- Stacking: Multiple modals stack with increased z-index

#### Animations

- Backdrop: Fade in (opacity 0→0.5), blur effect
- Modal: Slide up from translateY(20px) + fade, duration-300, ease-spring
- Close: Reverse animations, duration-200

#### Accessibility

- `role="dialog"`, `aria-modal="true"`
- `aria-labelledby` pointing to title
- Focus moves to first focusable element on open
- Focus returns to trigger element on close

---

### 11. Toast Notification Component

**Purpose**: Non-blocking feedback messages.

#### Structure

```
┌────────────────────────────────────────────┐
│ [Icon]  Message text here            [✕]   │
│ ═══════════════════════════════            │  ← Progress bar
└────────────────────────────────────────────┘
```

#### Variants

| Variant | Icon | Colors |
|---------|------|--------|
| `success` | Checkmark | success-500 border/icon, success-50 bg |
| `error` | X circle | error-500 border/icon, error-50 bg |
| `warning` | Alert triangle | warning-500 border/icon, warning-50 bg |
| `info` | Info circle | info-500 border/icon, info-50 bg |

#### Behavior

- Position: Top-right, 16px from edges
- Auto-dismiss: 5 seconds (configurable)
- Manual dismiss: X button
- Stacking: New toasts push older ones down
- Max visible: 5 (oldest auto-dismissed if exceeded)

#### Animations

- Enter: Slide in from right + fade, duration-300
- Progress bar: Width 100% → 0% over duration
- Exit: Slide out to right + fade, duration-200
- Stack reorder: Smooth translate animation

---

### 12. Theme Toggle Component

**Purpose**: Switch between light and dark modes.

#### Structure

```
Light mode:  [☀️]
Dark mode:   [🌙]
```

#### Behavior

- Click toggles theme
- Icon morphs between sun and moon
- Persists to localStorage
- Respects system preference on first load

#### Animations

- Icon: Rotate 360deg + scale, duration-300
- Morph: Smooth path transition between icons
- Theme transition: All colors transition, duration-200

---

### 13. Command Palette Component

**Purpose**: Quick actions and search via keyboard.

#### Structure

```
┌──────────────────────────────────────────────────────────┐
│ 🔍 Type a command or search...                           │
├──────────────────────────────────────────────────────────┤
│ Recent                                                   │
│   📝 Create new task                              ↵      │
│   🔍 Search "project"                             ↵      │
├──────────────────────────────────────────────────────────┤
│ Actions                                                  │
│   📝 Create new task                              ⌘N     │
│   🔍 Search tasks                                 ⌘F     │
│   🌙 Toggle dark mode                             ⌘D     │
│   👤 Profile settings                             ⌘,     │
│   🚪 Logout                                       ⌘Q     │
└──────────────────────────────────────────────────────────┘
```

#### Features

- Trigger: Cmd+K (Mac) / Ctrl+K (Windows)
- Fuzzy search across commands
- Arrow keys navigate, Enter selects
- Escape closes
- Recently used commands at top

#### Animations

- Entry: Backdrop fade + modal slide down, duration-200
- Search results: Fade in as user types
- Selection highlight: Background color transition

---

### 14. Loading Skeleton Component

**Purpose**: Placeholder during content loading.

#### Variants

| Variant | Structure |
|---------|-----------|
| `text` | Single line, variable width |
| `title` | Wider single line |
| `paragraph` | 3-4 lines of varying width |
| `avatar` | Circular |
| `card` | Rounded rectangle |
| `task` | Matches TaskCard layout |

#### Animation

- Shimmer: Gradient moves left to right, duration-1500, infinite
- Colors: neutral-200 base, neutral-100 shimmer highlight

#### Usage Pattern

```
Loading:  [░░░░░░░░░░░░░░░░]  (skeleton)
Loaded:   Actual content       (fade in)
```

---

## Accessibility Requirements (All Components)

1. **Keyboard Navigation**: All interactive elements reachable via Tab
2. **Focus Indicators**: Visible focus rings (2px, primary-500)
3. **ARIA Labels**: Proper labels for icons and non-text elements
4. **Color Contrast**: 4.5:1 for text, 3:1 for UI elements
5. **Reduced Motion**: Respect `prefers-reduced-motion` media query
6. **Screen Reader**: Proper semantic HTML and ARIA live regions

---

## Performance Guidelines

1. **Memoization**: Memoize expensive renders (task cards, lists)
2. **Lazy Loading**: Components below fold loaded on demand
3. **Virtualization**: Long lists (>50 items) use virtual scrolling
4. **Animation Performance**: Use `transform` and `opacity` only (GPU-accelerated)
5. **Bundle Size**: Each component tree-shakeable
