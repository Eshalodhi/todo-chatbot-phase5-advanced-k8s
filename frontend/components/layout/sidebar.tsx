'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSidebar } from '@/components/providers/sidebar-provider';

// =============================================================================
// Types
// =============================================================================

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface SidebarProps {
  className?: string;
}

// =============================================================================
// Navigation Items
// =============================================================================

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'All Tasks',
    href: '/dashboard/tasks',
    icon: CheckSquare,
  },
  {
    label: 'AI Chat',
    href: '/chat',
    icon: MessageSquare,
  },
];

const bottomNavItems: NavItem[] = [
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
  {
    label: 'Help',
    href: '/dashboard/help',
    icon: HelpCircle,
  },
];

// =============================================================================
// Nav Link Component
// =============================================================================

interface NavLinkProps {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
}

function NavLink({ item, isCollapsed, isActive }: NavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        isActive && 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
        !isActive && 'text-neutral-600 dark:text-neutral-400',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary-500')} />

      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="text-sm font-medium whitespace-nowrap overflow-hidden"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {item.badge && !isCollapsed && (
        <span className="ml-auto bg-primary-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// =============================================================================
// Sidebar Component
// =============================================================================

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, toggleCollapse } = useSidebar();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-16 bottom-0 z-40',
        'bg-background border-r border-border',
        'flex flex-col',
        'hidden md:flex',
        className
      )}
    >
      {/* Main Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
            isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      {/* Divider */}
      <div className="px-3">
        <div className="border-t border-border" />
      </div>

      {/* Bottom Navigation */}
      <nav className="p-3 space-y-1">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
            isActive={pathname === item.href}
          />
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-border">
        <button
          onClick={toggleCollapse}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
            'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300',
            'hover:bg-neutral-100 dark:hover:bg-neutral-800',
            'transition-colors duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            isCollapsed && 'justify-center px-2'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

// =============================================================================
// Mobile Sidebar Component
// =============================================================================

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  // Close on route change
  React.useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-50 bg-background border-r border-border flex flex-col md:hidden"
          >
            {/* Header */}
            <div className="h-16 flex items-center px-4 border-b border-border">
              <span className="text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
                TaskFlow
              </span>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isCollapsed={false}
                  isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
                />
              ))}
            </nav>

            {/* Divider */}
            <div className="px-3">
              <div className="border-t border-border" />
            </div>

            {/* Bottom Navigation */}
            <nav className="p-3 space-y-1">
              {bottomNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  isCollapsed={false}
                  isActive={pathname === item.href}
                />
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
