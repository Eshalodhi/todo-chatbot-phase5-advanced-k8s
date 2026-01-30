'use client';

import * as React from 'react';
import type { Theme, ThemeContextValue } from '@/types';

// =============================================================================
// Theme Context
// =============================================================================

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

// =============================================================================
// Theme Provider Props
// =============================================================================

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableTransitions?: boolean;
}

// =============================================================================
// Theme Provider Component
// =============================================================================

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  enableTransitions = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = React.useState(false);

  // Get system preference
  const getSystemTheme = React.useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Resolve the actual theme to apply
  const resolveTheme = React.useCallback(
    (themeValue: Theme): 'light' | 'dark' => {
      if (themeValue === 'system') {
        return getSystemTheme();
      }
      return themeValue;
    },
    [getSystemTheme]
  );

  // Apply theme to document
  const applyTheme = React.useCallback(
    (resolved: 'light' | 'dark') => {
      const root = document.documentElement;

      // Add transition class if enabled
      if (enableTransitions) {
        root.classList.add('theme-transition');
      }

      // Apply dark class
      if (resolved === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Update meta theme-color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute(
          'content',
          resolved === 'dark' ? '#0a0a0a' : '#ffffff'
        );
      }

      // Remove transition class after animation
      if (enableTransitions) {
        setTimeout(() => {
          root.classList.remove('theme-transition');
        }, 300);
      }
    },
    [enableTransitions]
  );

  // Set theme with persistence
  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);

      // Store preference
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, newTheme);
      }

      // Resolve and apply
      const resolved = resolveTheme(newTheme);
      setResolvedTheme(resolved);
      applyTheme(resolved);
    },
    [storageKey, resolveTheme, applyTheme]
  );

  // Initialize theme on mount
  React.useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null;
    const initialTheme = stored || defaultTheme;

    setThemeState(initialTheme);
    const resolved = resolveTheme(initialTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    setMounted(true);
  }, [defaultTheme, storageKey, resolveTheme, applyTheme]);

  // Listen for system theme changes
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        const resolved = getSystemTheme();
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, getSystemTheme, applyTheme]);

  // Provide context value
  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
    }),
    [theme, resolvedTheme, setTheme]
  );

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <ThemeContext.Provider value={value}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// =============================================================================
// useTheme Hook
// =============================================================================

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// =============================================================================
// Export Context for Advanced Usage
// =============================================================================

export { ThemeContext };
