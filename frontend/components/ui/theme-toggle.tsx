'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor } from 'lucide-react';
import type { Theme } from '@/types';

// =============================================================================
// Types
// =============================================================================

interface ThemeToggleProps {
  variant?: 'icon' | 'button' | 'dropdown';
  className?: string;
}

// =============================================================================
// Icon Variants
// =============================================================================

const iconVariants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: { scale: 1, rotate: 0, opacity: 1 },
  exit: { scale: 0, rotate: 180, opacity: 0 },
};

// =============================================================================
// Simple Icon Toggle
// =============================================================================

function IconToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    // Cycle through: light -> dark -> system -> light
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-4 h-4" />;
    }
    return resolvedTheme === 'dark' ? (
      <Sun className="w-4 h-4" />
    ) : (
      <Moon className="w-4 h-4" />
    );
  };

  const getLabel = () => {
    if (theme === 'system') return 'System theme';
    return resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      className={cn('relative', className)}
      aria-label={getLabel()}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme === 'system' ? 'system' : resolvedTheme}
          variants={iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2 }}
        >
          {getIcon()}
        </motion.div>
      </AnimatePresence>
    </Button>
  );
}

// =============================================================================
// Dropdown Toggle (with all options)
// =============================================================================

function DropdownToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const options: { value: Theme; label: string; icon: React.ElementType }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  const currentOption = options.find((opt) => opt.value === theme) || options[2];

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change theme"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <currentOption.icon className="w-4 h-4" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 mt-2 w-36 rounded-lg bg-background border border-border shadow-lg z-50 overflow-hidden"
          >
            <div className="p-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                    theme === option.value
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  )}
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Segmented Button Toggle
// =============================================================================

function ButtonToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; icon: React.ElementType; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light mode' },
    { value: 'dark', icon: Moon, label: 'Dark mode' },
    { value: 'system', icon: Monitor, label: 'System preference' },
  ];

  return (
    <div
      className={cn(
        'inline-flex items-center p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800',
        className
      )}
      role="group"
      aria-label="Theme selection"
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => setTheme(option.value)}
          className={cn(
            'relative p-2 rounded-md transition-all',
            theme === option.value
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={option.label}
          aria-pressed={theme === option.value}
        >
          {theme === option.value && (
            <motion.div
              layoutId="theme-toggle-bg"
              className="absolute inset-0 bg-background shadow-sm rounded-md"
              transition={{ type: 'spring', duration: 0.3 }}
            />
          )}
          <option.icon className="w-4 h-4 relative z-10" />
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// Main ThemeToggle Component
// =============================================================================

export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  switch (variant) {
    case 'dropdown':
      return <DropdownToggle className={className} />;
    case 'button':
      return <ButtonToggle className={className} />;
    case 'icon':
    default:
      return <IconToggle className={className} />;
  }
}

// =============================================================================
// Export individual variants for direct use
// =============================================================================

export { IconToggle as ThemeToggleIcon };
export { DropdownToggle as ThemeToggleDropdown };
export { ButtonToggle as ThemeToggleButton };
