'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-auth';
import {
  Search,
  Plus,
  Sun,
  Moon,
  Monitor,
  LogOut,
  LayoutDashboard,
  CheckSquare,
  Settings,
  HelpCircle,
  Command,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  shortcut?: string[];
  action: () => void;
  category: 'navigation' | 'tasks' | 'theme' | 'account';
  keywords?: string[];
}

interface CommandPaletteProps {
  onCreateTask?: () => void;
}

// =============================================================================
// Animation Variants
// =============================================================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const paletteVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -20,
    transition: { duration: 0.15 },
  },
};

// =============================================================================
// Command Palette Context
// =============================================================================

interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | undefined>(undefined);

export function useCommandPalette() {
  const context = React.useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
}

// =============================================================================
// Command Palette Provider
// =============================================================================

interface CommandPaletteProviderProps {
  children: React.ReactNode;
  onCreateTask?: () => void;
}

export function CommandPaletteProvider({ children, onCreateTask }: CommandPaletteProviderProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  const value = React.useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPalette onCreateTask={onCreateTask} />
    </CommandPaletteContext.Provider>
  );
}

// =============================================================================
// Command Palette Component
// =============================================================================

function CommandPalette({ onCreateTask }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { logout, isAuthenticated } = useAuth();
  const { isOpen, close } = useCommandPalette();

  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Define commands
  const commands = React.useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      // Navigation
      {
        id: 'goto-dashboard',
        label: 'Go to Dashboard',
        description: 'View your tasks and stats',
        icon: LayoutDashboard,
        shortcut: ['G', 'D'],
        action: () => {
          router.push('/dashboard');
          close();
        },
        category: 'navigation',
        keywords: ['home', 'main', 'overview'],
      },
      {
        id: 'goto-tasks',
        label: 'Go to Tasks',
        description: 'View all your tasks',
        icon: CheckSquare,
        shortcut: ['G', 'T'],
        action: () => {
          router.push('/dashboard');
          close();
        },
        category: 'navigation',
        keywords: ['list', 'todos'],
      },
      // Tasks
      {
        id: 'new-task',
        label: 'Create New Task',
        description: 'Add a new task to your list',
        icon: Plus,
        shortcut: ['N'],
        action: () => {
          if (onCreateTask) {
            onCreateTask();
          }
          close();
        },
        category: 'tasks',
        keywords: ['add', 'todo', 'create'],
      },
      // Theme
      {
        id: 'theme-light',
        label: 'Switch to Light Mode',
        description: 'Use light color scheme',
        icon: Sun,
        action: () => {
          setTheme('light');
          close();
        },
        category: 'theme',
        keywords: ['appearance', 'bright'],
      },
      {
        id: 'theme-dark',
        label: 'Switch to Dark Mode',
        description: 'Use dark color scheme',
        icon: Moon,
        action: () => {
          setTheme('dark');
          close();
        },
        category: 'theme',
        keywords: ['appearance', 'night'],
      },
      {
        id: 'theme-system',
        label: 'Use System Theme',
        description: 'Follow system preference',
        icon: Monitor,
        action: () => {
          setTheme('system');
          close();
        },
        category: 'theme',
        keywords: ['appearance', 'auto'],
      },
    ];

    // Add account commands only if authenticated
    if (isAuthenticated) {
      items.push({
        id: 'logout',
        label: 'Sign Out',
        description: 'Log out of your account',
        icon: LogOut,
        action: async () => {
          await logout();
          close();
        },
        category: 'account',
        keywords: ['signout', 'exit'],
      });
    }

    return items;
  }, [router, close, onCreateTask, setTheme, isAuthenticated, logout]);

  // Filter commands based on query
  const filteredCommands = React.useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(lowerQuery);
      const matchDescription = cmd.description?.toLowerCase().includes(lowerQuery);
      const matchKeywords = cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery));
      return matchLabel || matchDescription || matchKeywords;
    });
  }, [commands, query]);

  // Group commands by category
  const groupedCommands = React.useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    tasks: 'Tasks',
    theme: 'Theme',
    account: 'Account',
  };

  // Reset state when opening
  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selected index when filtered results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, close]);

  // Scroll selected item into view
  React.useEffect(() => {
    if (!listRef.current) return;
    const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={close}
            aria-hidden="true"
          />

          {/* Palette */}
          <motion.div
            variants={paletteVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4"
          >
            <div className="bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground bg-muted rounded">
                  ESC
                </kbd>
              </div>

              {/* Command List */}
              <div
                ref={listRef}
                className="max-h-[300px] overflow-y-auto p-2"
                role="listbox"
              >
                {filteredCommands.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No commands found for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  Object.entries(groupedCommands).map(([category, items]) => (
                    <div key={category} className="mb-2 last:mb-0">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {categoryLabels[category]}
                      </div>
                      {items.map((cmd) => {
                        const globalIndex = filteredCommands.indexOf(cmd);
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = cmd.icon;

                        return (
                          <button
                            key={cmd.id}
                            data-index={globalIndex}
                            onClick={() => cmd.action()}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                              isSelected
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                                : 'text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800'
                            )}
                            role="option"
                            aria-selected={isSelected}
                          >
                            <Icon className={cn(
                              'w-4 h-4 flex-shrink-0',
                              isSelected ? 'text-primary-500' : 'text-muted-foreground'
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {cmd.label}
                              </div>
                              {cmd.description && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {cmd.description}
                                </div>
                              )}
                            </div>
                            {cmd.shortcut && (
                              <div className="hidden sm:flex items-center gap-1">
                                {cmd.shortcut.map((key, i) => (
                                  <kbd
                                    key={i}
                                    className="px-1.5 py-0.5 text-xs font-medium text-muted-foreground bg-muted rounded"
                                  >
                                    {key}
                                  </kbd>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/50 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" />
                    <ArrowDown className="w-3 h-3" />
                    Navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3" />
                    Select
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <Command className="w-3 h-3" />K to toggle
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =============================================================================
// Keyboard Shortcut Hint Component
// =============================================================================

export function CommandPaletteHint({ className }: { className?: string }) {
  return (
    <button
      onClick={() => {
        // Dispatch keyboard event to open palette
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', metaKey: true })
        );
      }}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground',
        'bg-muted rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors',
        className
      )}
    >
      <Search className="w-4 h-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-background rounded border border-border">
        <Command className="w-3 h-3" />K
      </kbd>
    </button>
  );
}

export { CommandPalette };
