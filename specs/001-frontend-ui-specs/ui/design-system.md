# Design System Specification

**Feature Branch**: `001-frontend-ui-specs`
**Created**: 2026-01-01
**Status**: Draft
**Input**: Modern, visually stunning multi-user todo web application with advanced UI/UX patterns

---

## Overview

This design system establishes the visual language and component tokens for a modern todo application inspired by Linear, Notion, and Vercel. The system prioritizes consistency, accessibility, and delightful micro-interactions.

---

## Color Palette

### Primary Colors (Brand Identity)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `primary-50` | #eff6ff | #1e3a5f | Backgrounds, hover states |
| `primary-100` | #dbeafe | #1e40af | Light accents |
| `primary-200` | #bfdbfe | #1d4ed8 | Borders, dividers |
| `primary-300` | #93c5fd | #2563eb | Secondary text |
| `primary-400` | #60a5fa | #3b82f6 | Interactive elements |
| `primary-500` | #3b82f6 | #60a5fa | Primary buttons, links |
| `primary-600` | #2563eb | #93c5fd | Hover states |
| `primary-700` | #1d4ed8 | #bfdbfe | Active states |
| `primary-800` | #1e40af | #dbeafe | Focus rings |
| `primary-900` | #1e3a5f | #eff6ff | Text on light backgrounds |

### Secondary Colors (Accent - Purple)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `secondary-50` | #faf5ff | #2e1065 | Subtle backgrounds |
| `secondary-100` | #f3e8ff | #4c1d95 | Hover backgrounds |
| `secondary-200` | #e9d5ff | #5b21b6 | Borders |
| `secondary-300` | #d8b4fe | #6d28d9 | Icons |
| `secondary-400` | #c084fc | #7c3aed | Accent elements |
| `secondary-500` | #8b5cf6 | #a78bfa | Secondary actions |
| `secondary-600` | #7c3aed | #c084fc | Hover states |
| `secondary-700` | #6d28d9 | #d8b4fe | Active states |
| `secondary-800` | #5b21b6 | #e9d5ff | Text accents |
| `secondary-900` | #4c1d95 | #f3e8ff | Emphasis text |

### Neutral Colors (Backgrounds, Borders, Text)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `neutral-0` | #ffffff | #0a0a0a | Page background |
| `neutral-50` | #fafafa | #0f0f0f | Card backgrounds |
| `neutral-100` | #f5f5f5 | #171717 | Elevated surfaces |
| `neutral-200` | #e5e5e5 | #262626 | Borders, dividers |
| `neutral-300` | #d4d4d4 | #404040 | Disabled states |
| `neutral-400` | #a3a3a3 | #525252 | Placeholder text |
| `neutral-500` | #737373 | #737373 | Secondary text |
| `neutral-600` | #525252 | #a3a3a3 | Body text |
| `neutral-700` | #404040 | #d4d4d4 | Headings |
| `neutral-800` | #262626 | #e5e5e5 | Primary text |
| `neutral-900` | #171717 | #f5f5f5 | Emphasis text |
| `neutral-950` | #0a0a0a | #fafafa | Maximum contrast |

### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `success-50` | #ecfdf5 | #022c22 | Success backgrounds |
| `success-500` | #10b981 | #34d399 | Success indicators |
| `success-600` | #059669 | #6ee7b7 | Success text |
| `error-50` | #fef2f2 | #450a0a | Error backgrounds |
| `error-500` | #ef4444 | #f87171 | Error indicators |
| `error-600` | #dc2626 | #fca5a5 | Error text |
| `warning-50` | #fffbeb | #451a03 | Warning backgrounds |
| `warning-500` | #f59e0b | #fbbf24 | Warning indicators |
| `warning-600` | #d97706 | #fcd34d | Warning text |
| `info-50` | #eff6ff | #172554 | Info backgrounds |
| `info-500` | #3b82f6 | #60a5fa | Info indicators |
| `info-600` | #2563eb | #93c5fd | Info text |

---

## Typography

### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `font-sans` | Inter, system-ui, -apple-system, sans-serif | Primary text |
| `font-mono` | JetBrains Mono, Fira Code, monospace | Code, technical |

### Font Sizes

| Token | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xs` | 12px (0.75rem) | 16px (1rem) | Captions, labels |
| `text-sm` | 14px (0.875rem) | 20px (1.25rem) | Secondary text, buttons |
| `text-base` | 16px (1rem) | 24px (1.5rem) | Body text |
| `text-lg` | 18px (1.125rem) | 28px (1.75rem) | Large body |
| `text-xl` | 20px (1.25rem) | 28px (1.75rem) | Subheadings |
| `text-2xl` | 24px (1.5rem) | 32px (2rem) | Section headings |
| `text-3xl` | 30px (1.875rem) | 36px (2.25rem) | Page headings |
| `text-4xl` | 36px (2.25rem) | 40px (2.5rem) | Hero titles |
| `text-5xl` | 48px (3rem) | 48px (3rem) | Display text |

### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `font-light` | 300 | Decorative text |
| `font-regular` | 400 | Body text |
| `font-medium` | 500 | Emphasis, buttons |
| `font-semibold` | 600 | Headings, labels |
| `font-bold` | 700 | Strong emphasis |

### Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `tracking-tighter` | -0.05em | Large display text |
| `tracking-tight` | -0.025em | Headings |
| `tracking-normal` | 0 | Body text |
| `tracking-wide` | 0.025em | Uppercase labels |
| `tracking-wider` | 0.05em | Small caps |

---

## Spacing System

Base unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | Reset |
| `space-1` | 4px (0.25rem) | Tight spacing |
| `space-2` | 8px (0.5rem) | Small gaps |
| `space-3` | 12px (0.75rem) | Icon-text gaps |
| `space-4` | 16px (1rem) | Standard padding |
| `space-5` | 20px (1.25rem) | Medium gaps |
| `space-6` | 24px (1.5rem) | Section spacing |
| `space-8` | 32px (2rem) | Large gaps |
| `space-10` | 40px (2.5rem) | Component spacing |
| `space-12` | 48px (3rem) | Section breaks |
| `space-16` | 64px (4rem) | Page sections |
| `space-20` | 80px (5rem) | Major sections |
| `space-24` | 96px (6rem) | Hero spacing |

---

## Shadows (Elevation System)

### Standard Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | 0 1px 2px 0 rgb(0 0 0 / 0.05) | Subtle elevation |
| `shadow-md` | 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) | Cards, dropdowns |
| `shadow-lg` | 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) | Modals, popovers |
| `shadow-xl` | 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) | Elevated dialogs |
| `shadow-2xl` | 0 25px 50px -12px rgb(0 0 0 / 0.25) | Maximum elevation |

### Colored Shadows (Brand Accent)

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-primary` | 0 4px 14px 0 rgb(59 130 246 / 0.25) | Primary buttons |
| `shadow-success` | 0 4px 14px 0 rgb(16 185 129 / 0.25) | Success states |
| `shadow-error` | 0 4px 14px 0 rgb(239 68 68 / 0.25) | Error states |

### Inner Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-inner` | inset 0 2px 4px 0 rgb(0 0 0 / 0.05) | Inset elements |
| `shadow-inner-lg` | inset 0 4px 6px 0 rgb(0 0 0 / 0.1) | Deep inset |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-none` | 0px | Sharp corners |
| `rounded-sm` | 4px (0.25rem) | Subtle rounding |
| `rounded-md` | 6px (0.375rem) | Buttons, inputs |
| `rounded-lg` | 8px (0.5rem) | Cards |
| `rounded-xl` | 12px (0.75rem) | Modals, large cards |
| `rounded-2xl` | 16px (1rem) | Feature cards |
| `rounded-3xl` | 24px (1.5rem) | Hero elements |
| `rounded-full` | 9999px | Pills, avatars |

---

## Animations

### Transition Durations

| Token | Value | Usage |
|-------|-------|-------|
| `duration-75` | 75ms | Instant feedback |
| `duration-100` | 100ms | Micro-interactions |
| `duration-150` | 150ms | Fast transitions (hover) |
| `duration-200` | 200ms | Quick animations |
| `duration-300` | 300ms | Normal transitions |
| `duration-500` | 500ms | Slow, deliberate animations |
| `duration-700` | 700ms | Page transitions |
| `duration-1000` | 1000ms | Complex sequences |

### Easing Functions

| Token | Value | Usage |
|-------|-------|-------|
| `ease-linear` | linear | Progress bars |
| `ease-in` | cubic-bezier(0.4, 0, 1, 1) | Exit animations |
| `ease-out` | cubic-bezier(0, 0, 0.2, 1) | Enter animations |
| `ease-in-out` | cubic-bezier(0.4, 0, 0.2, 1) | Standard transitions |
| `ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy, playful |
| `ease-bounce` | cubic-bezier(0.68, -0.55, 0.27, 1.55) | Overshoot effect |

### Animation Patterns

| Pattern | Properties | Usage |
|---------|-----------|-------|
| `fade-in` | opacity: 0 → 1, duration-300, ease-out | Element appearance |
| `fade-out` | opacity: 1 → 0, duration-200, ease-in | Element removal |
| `slide-up` | translateY: 16px → 0, opacity: 0 → 1, duration-300, ease-out | Modal entry |
| `slide-down` | translateY: -16px → 0, opacity: 0 → 1, duration-300, ease-out | Dropdown entry |
| `scale-in` | scale: 0.95 → 1, opacity: 0 → 1, duration-200, ease-out | Button feedback |
| `scale-out` | scale: 1 → 0.95, opacity: 1 → 0, duration-150, ease-in | Quick dismiss |

---

## Glassmorphism Effects

| Token | Value | Usage |
|-------|-------|-------|
| `glass-light` | backdrop-blur: 12px, background: rgb(255 255 255 / 0.8), border: 1px solid rgb(255 255 255 / 0.2) | Light mode glass |
| `glass-dark` | backdrop-blur: 12px, background: rgb(0 0 0 / 0.5), border: 1px solid rgb(255 255 255 / 0.1) | Dark mode glass |
| `glass-blur-sm` | backdrop-blur: 4px | Subtle blur |
| `glass-blur-md` | backdrop-blur: 8px | Medium blur |
| `glass-blur-lg` | backdrop-blur: 16px | Strong blur |
| `glass-blur-xl` | backdrop-blur: 24px | Maximum blur |

---

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `z-0` | 0 | Base level |
| `z-10` | 10 | Elevated cards |
| `z-20` | 20 | Sticky headers |
| `z-30` | 30 | Dropdowns |
| `z-40` | 40 | Fixed elements |
| `z-50` | 50 | Modal overlays |
| `z-60` | 60 | Modal content |
| `z-70` | 70 | Toasts |
| `z-80` | 80 | Command palette |
| `z-90` | 90 | Tooltips |
| `z-max` | 9999 | Critical overlays |

---

## Breakpoints (Responsive)

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Ultrawide |

---

## Component Tokens

### Button Tokens

| Token | Value |
|-------|-------|
| `button-height-sm` | 32px |
| `button-height-md` | 40px |
| `button-height-lg` | 48px |
| `button-padding-x-sm` | 12px |
| `button-padding-x-md` | 16px |
| `button-padding-x-lg` | 24px |
| `button-font-size-sm` | text-sm |
| `button-font-size-md` | text-sm |
| `button-font-size-lg` | text-base |
| `button-radius` | rounded-md |

### Input Tokens

| Token | Value |
|-------|-------|
| `input-height` | 40px |
| `input-padding-x` | 12px |
| `input-font-size` | text-base |
| `input-radius` | rounded-md |
| `input-border-width` | 1px |

### Card Tokens

| Token | Value |
|-------|-------|
| `card-padding` | space-4 |
| `card-radius` | rounded-lg |
| `card-shadow` | shadow-md |
| `card-border` | 1px solid neutral-200 |

---

## Accessibility Requirements

- All color combinations MUST meet WCAG 2.1 AA contrast ratios (4.5:1 for text, 3:1 for UI)
- Focus states MUST be visible with a 2px ring using `primary-500`
- Interactive elements MUST have minimum touch target of 44x44px on mobile
- All animations MUST respect `prefers-reduced-motion` media query
- Color MUST NOT be the only means of conveying information

---

## Dark Mode Implementation

1. Use CSS custom properties for all color tokens
2. Toggle dark class on `<html>` element
3. Persist preference to localStorage
4. Respect `prefers-color-scheme` on first visit
5. Transition colors with `duration-200` when switching themes
