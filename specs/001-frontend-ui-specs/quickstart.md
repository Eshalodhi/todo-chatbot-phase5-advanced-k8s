# Quickstart: Frontend UI Implementation

**Feature Branch**: `001-frontend-ui-specs`
**Date**: 2026-01-01

---

## Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm (preferred) or npm
- Backend API running (or mock server)
- Environment variables configured

---

## 1. Initialize Next.js Project

```bash
# From project root
cd frontend

# Create Next.js app (if not exists)
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

**When prompted**:
- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- `src/` directory: No (use `app/` directly)
- App Router: Yes
- Import alias: `@/*`

---

## 2. Install Dependencies

```bash
# Core dependencies
pnpm add better-auth framer-motion react-hook-form @hookform/resolvers zod

# UI dependencies
pnpm add clsx tailwind-merge lucide-react react-hot-toast

# shadcn/ui CLI
pnpm add -D @shadcn/ui

# Dev dependencies
pnpm add -D @types/node vitest @testing-library/react @testing-library/jest-dom
```

---

## 3. Initialize shadcn/ui

```bash
# Initialize shadcn/ui
npx shadcn@latest init

# When prompted:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
```

### Install Required Components

```bash
npx shadcn@latest add button input label dialog dropdown-menu avatar checkbox
```

---

## 4. Configure Environment

Create `frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Better Auth Configuration
BETTER_AUTH_SECRET=your-secret-key-must-match-backend
BETTER_AUTH_URL=http://localhost:3000/api/auth
```

**Important**: `BETTER_AUTH_SECRET` must match the backend value exactly.

---

## 5. Configure TypeScript

Update `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "incremental": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## 6. Configure Tailwind

Update `frontend/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Use CSS variables from design system
        primary: {
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
        },
        // ... other colors from design-system.md
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## 7. Create Project Structure

```bash
# Create directories
mkdir -p components/ui components/features components/layout components/providers
mkdir -p lib hooks types

# Create placeholder files
touch lib/api.ts lib/auth.ts lib/utils.ts lib/validations.ts
touch types/index.ts
touch hooks/use-auth.ts hooks/use-theme.ts
```

---

## 8. Create Utility Functions

`frontend/lib/utils.ts`:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 9. Start Development Server

```bash
# From frontend directory
pnpm dev
```

Open http://localhost:3000 to verify setup.

---

## 10. Verify Setup Checklist

- [ ] Next.js starts without errors
- [ ] TypeScript compiles with `pnpm tsc --noEmit`
- [ ] Tailwind styles apply correctly
- [ ] shadcn/ui components render
- [ ] Environment variables load (check in browser console)
- [ ] Dark mode toggle works (after implementing)

---

## Directory Structure After Setup

```
frontend/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── features/     # TaskCard, TaskList, etc.
│   ├── layout/       # Header, Sidebar
│   └── providers/    # Theme, Auth, Toast providers
├── lib/
│   ├── api.ts        # API client
│   ├── auth.ts       # Better Auth config
│   ├── utils.ts      # Utility functions
│   └── validations.ts # Zod schemas
├── hooks/
│   ├── use-auth.ts
│   └── use-theme.ts
├── types/
│   └── index.ts
├── public/
├── .env.local
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Next Steps

1. **Phase 1**: Implement design system CSS variables in `globals.css`
2. **Phase 1**: Create atomic UI components (Button, Input)
3. **Phase 2**: Set up Better Auth configuration
4. **Phase 2**: Create auth pages (login, register)
5. **Phase 3**: Implement task management features
6. **Phase 4**: Polish, test, deploy

---

## Troubleshooting

### TypeScript Errors
```bash
pnpm tsc --noEmit
```

### Tailwind Not Working
- Verify `content` paths in `tailwind.config.ts`
- Check `globals.css` imports `@tailwind` directives

### Environment Variables
- Restart dev server after changing `.env.local`
- `NEXT_PUBLIC_*` prefix required for browser access

### Better Auth Issues
- Verify `BETTER_AUTH_SECRET` matches backend
- Check CORS configuration on backend
