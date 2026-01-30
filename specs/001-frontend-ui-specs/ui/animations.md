# Animations Specification

**Feature Branch**: `001-frontend-ui-specs`
**Created**: 2026-01-01
**Status**: Draft

---

## Overview

This document defines all animation patterns, timing functions, and motion design principles for the todo application. All animations prioritize performance (using GPU-accelerated properties) and accessibility (respecting reduced motion preferences).

---

## Core Principles

1. **Purpose**: Every animation serves a purpose (feedback, orientation, delight)
2. **Performance**: Use only `transform` and `opacity` for smooth 60fps
3. **Accessibility**: All animations disable for `prefers-reduced-motion: reduce`
4. **Consistency**: Reuse timing patterns across components
5. **Subtlety**: Animations enhance, not distract

---

## Timing Functions

### Standard Easings

| Name | Value | Usage |
|------|-------|-------|
| `ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations (elements appearing) |
| `ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations (elements leaving) |
| `ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Transitions (hover, color changes) |
| `linear` | `linear` | Progress bars, continuous animations |

### Expressive Easings

| Name | Value | Usage |
|------|-------|-------|
| `ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful, bouncy (modals, toggles) |
| `ease-bounce` | `cubic-bezier(0.68, -0.55, 0.27, 1.55)` | Overshoot effect (completion, success) |
| `ease-snappy` | `cubic-bezier(0.2, 0, 0, 1)` | Quick, responsive (buttons, menus) |

### Duration Scale

| Name | Duration | Usage |
|------|----------|-------|
| `instant` | 0ms | State changes without animation |
| `fast` | 100-150ms | Micro-interactions (hover, focus) |
| `normal` | 200-300ms | Standard transitions (modals, dropdowns) |
| `slow` | 400-500ms | Complex animations (page transitions) |
| `deliberate` | 600-1000ms | Emphasis animations (celebrations) |

---

## Page Transitions

### Route Change Animation

**Pattern**: Cross-fade with opacity

```
Current page:  opacity 1 → 0,  duration-200, ease-in
New page:      opacity 0 → 1,  duration-200, ease-out, delay-100
```

### Initial Page Load

**Pattern**: Staggered content reveal

```
1. Header:     translateY(-20px) → 0, opacity 0 → 1, duration-300
2. Sidebar:    translateX(-20px) → 0, opacity 0 → 1, duration-300, delay-100
3. Content:    opacity 0 → 1, duration-300, delay-200
4. Children:   Staggered, delay-50 between each
```

---

## Component Animations

### Modal Entry/Exit

**Entry**:
```
Backdrop:   opacity 0 → 1, duration-200, ease-out
            backdrop-filter: blur(0) → blur(8px)

Modal:      translateY(20px) → 0, opacity 0 → 1
            duration-300, ease-spring, delay-50
```

**Exit**:
```
Modal:      translateY(0) → 10px, opacity 1 → 0
            duration-200, ease-in

Backdrop:   opacity 1 → 0, duration-200, ease-in, delay-50
            backdrop-filter: blur(8px) → blur(0)
```

### Dropdown Menu

**Open**:
```
Container:  translateY(-8px) → 0, opacity 0 → 1
            duration-200, ease-out
            scale(0.95) → scale(1)
            transform-origin: top
```

**Close**:
```
Container:  translateY(0) → -4px, opacity 1 → 0
            duration-150, ease-in
```

### Toast Notification

**Enter**:
```
Container:  translateX(100%) → 0, opacity 0 → 1
            duration-300, ease-out
```

**Auto-dismiss Progress**:
```
Progress bar:  width 100% → 0%
               duration-5000, linear
```

**Exit**:
```
Container:  translateX(0) → 100%, opacity 1 → 0
            duration-200, ease-in
```

### Command Palette

**Open**:
```
Backdrop:   opacity 0 → 1, duration-150

Palette:    translateY(-20px) → 0, opacity 0 → 1
            duration-200, ease-out
            scale(0.98) → scale(1)
```

**Search Results**:
```
Each item:  opacity 0 → 1, duration-100
            Stagger: 30ms delay between items
```

---

## Task Card Animations

### List Entrance (Stagger)

**Pattern**: Cards appear sequentially from top to bottom

```
Each card:  translateY(16px) → 0, opacity 0 → 1
            duration-300, ease-out
            Stagger: 50ms delay between cards
            Max stagger: 500ms (first 10 cards, then instant)
```

### Card Hover

```
Container:  box-shadow: shadow-sm → shadow-md
            transform: scale(1) → scale(1.01)
            duration-150, ease-out

Action btns: opacity 0 → 1, duration-150
```

### Task Completion

**Checkbox Animation**:
```
1. Background: transparent → primary-500, duration-150
2. Checkmark SVG: stroke-dashoffset 100% → 0%, duration-200
3. Optional: Scale bounce (1 → 1.1 → 1), duration-300, ease-bounce
```

**Card State Change**:
```
Title:      text-decoration line-through, opacity → 0.6
            duration-200, ease-out

Card:       Reorder position (FLIP animation)
            duration-300, ease-out
```

### Task Deletion

**Confirmation Animation**:
```
Delete button area expands to show "Confirm Delete"
Width: 0 → 120px, duration-200
```

**Delete Animation**:
```
Card:       translateX(0) → 100%, opacity 1 → 0
            height auto → 0, duration-200, ease-in

Gap closes: duration-200, ease-out, delay-100
```

### Task Reordering (Drag and Drop)

**Drag Start**:
```
Dragged:    scale(1.02), box-shadow: shadow-xl
            opacity: 0.9
            cursor: grabbing

Original:   opacity 0.3 (placeholder)
```

**During Drag**:
```
Other cards: translateY() to make room
             duration-200, ease-out
```

**Drop**:
```
Card:       scale(1.02) → scale(1)
            shadow-xl → shadow-sm
            duration-200, ease-out
```

---

## Form Animations

### Floating Label Input

**Focus (empty input)**:
```
Label:      translateY(0) → translateY(-100%)
            scale(1) → scale(0.85)
            color: neutral-400 → primary-500
            duration-200, ease-out
```

**Blur (empty input)**:
```
Label:      Reverse of focus animation
            duration-150, ease-in
```

**Error State**:
```
Border:     color → error-500, duration-150
Input:      Shake animation (see below)
Error msg:  translateY(-4px) → 0, opacity 0 → 1
            duration-200, ease-out
```

### Error Shake Animation

```
@keyframes shake {
  0%, 100%   { translateX(0) }
  20%, 60%   { translateX(4px) }
  40%, 80%   { translateX(-4px) }
}
duration-300, ease-in-out
```

### Submit Button Loading

```
1. Text:     opacity 1 → 0, duration-100
2. Spinner:  opacity 0 → 1, duration-100
3. Spinner:  rotate(0) → rotate(360deg)
             duration-1000, linear, infinite
```

### Success Feedback

```
1. Button:   Background → success-500, duration-200
2. Text:     Fade to checkmark icon, duration-150
3. Optional: Small confetti burst from button center
```

---

## Loading Animations

### Skeleton Shimmer

```
Background gradient:
  linear-gradient(
    90deg,
    neutral-200 0%,
    neutral-100 50%,
    neutral-200 100%
  )

Animation:
  background-position: -200% → 200%
  duration-1500, linear, infinite
```

### Spinner

```
SVG circle with stroke-dasharray:

@keyframes spin {
  0%    { rotate(0deg) }
  100%  { rotate(360deg) }
}
duration-1000, linear, infinite
```

### Content Load Transition

```
Skeleton:   opacity 1 → 0, duration-200
Content:    opacity 0 → 1, duration-300, delay-100
```

---

## Micro-interactions

### Button Hover

```
transform:    scale(1) → scale(1.02)
box-shadow:   Current → +2px Y offset
duration-150, ease-out
```

### Button Press

```
transform:    scale(1.02) → scale(0.98)
duration-100, ease-in
```

### Link Hover

```
Underline:    width 0 → 100%, from left
              duration-200, ease-out
              OR
              opacity 0 → 1, duration-150
```

### Checkbox Check

```
1. Box scale: 1 → 0.9 → 1, duration-200
2. Background: Fill in, duration-100
3. Checkmark: Draw from bottom-left to top-right
   stroke-dashoffset 100% → 0%, duration-200
```

### Toggle Switch

```
Knob:         translateX(0) → translateX(20px)
              duration-200, ease-spring

Track:        background neutral-300 → primary-500
              duration-200, ease-out
```

### Theme Toggle (Sun/Moon)

```
Icon:         rotate(0) → rotate(360deg)
              scale(1) → scale(0) → scale(1)
              duration-500, ease-spring

Morph:        Sun paths → Moon paths
              duration-300
```

---

## Gesture Animations (Mobile)

### Swipe to Delete

```
Swipe right reveals delete action:

Card:         translateX(0) → translateX(-80px)
              With rubber-band resistance past threshold

Delete bg:    Revealed underneath
              Red background with trash icon

On release:
  - If past threshold: Continue slide + delete
  - If not: Snap back, duration-200, ease-out
```

### Pull to Refresh

```
Pull down:
  Spinner icon revealed at top
  Rotates as user pulls (1:1 with distance)

Release:
  If past threshold: Spinner continues, fetch data
  Snap back when complete, duration-300
```

### Long Press Context Menu

```
Hold 500ms:

Haptic feedback (if supported)
Context menu:   scale(0.8) → scale(1), opacity 0 → 1
                duration-200, ease-spring
                transform-origin: press point
```

---

## Reduced Motion Support

### Implementation

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Alternatives for Reduced Motion

| Original | Reduced Motion Alternative |
|----------|---------------------------|
| Slide in | Instant appear (opacity only) |
| Shake | Border color flash |
| Staggered list | All appear at once |
| Skeleton shimmer | Static gray background |
| Spinner | Static loading text |
| Confetti | Checkmark icon only |

---

## Performance Guidelines

### GPU-Accelerated Properties Only

Use only these properties for animations:
- `transform` (translate, scale, rotate)
- `opacity`

Avoid animating:
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- `border-width`
- `box-shadow` (use pseudo-elements with opacity instead)

### Animation Optimization

1. **will-change**: Use sparingly for complex animations
2. **Layer promotion**: Use `transform: translateZ(0)` for fixed headers
3. **Composite layers**: Keep animated elements isolated
4. **Reduce paint**: Avoid animating properties that trigger paint

### Framer Motion Best Practices

```tsx
// Good: Using layout animations
<motion.div layout layoutId="task-card">

// Good: Using AnimatePresence for exits
<AnimatePresence mode="wait">
  {isVisible && <motion.div exit={{ opacity: 0 }} />}
</AnimatePresence>

// Good: Shared element transitions
<motion.div layoutId={`task-${id}`}>
```

---

## Animation Library Usage

### Tailwind CSS Transitions

Use for simple hover/focus states:
```
transition-all duration-150 ease-out
```

### Framer Motion

Use for:
- Page transitions
- Layout animations
- Gesture interactions
- Complex sequences
- Exit animations

### CSS Keyframes

Use for:
- Infinite animations (spinners, shimmer)
- Performance-critical animations
- Simple repeating patterns
