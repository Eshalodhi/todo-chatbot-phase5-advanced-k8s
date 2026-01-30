'use client';

import * as React from 'react';
import { ProtectedRoute } from '@/components/providers/auth-provider';
import { TasksProvider, useTasks } from '@/hooks/use-tasks';
import { useChatTaskRefresh } from '@/components/providers/chat-provider';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Sidebar } from '@/components/layout/sidebar';
import { CommandPaletteProvider } from '@/components/features/command-palette';
import { SidebarProvider, useSidebar } from '@/components/providers/sidebar-provider';

// Component to connect task refresh with chat provider
function ChatTaskRefreshConnector({ children }: { children: React.ReactNode }) {
  const { refetch } = useTasks();
  useChatTaskRefresh(refetch);
  return <>{children}</>;
}

// Hook to detect desktop viewport
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}

// Main content wrapper that responds to sidebar state
// Mobile: no margin (sidebar is overlay)
// Desktop: dynamic margin based on sidebar collapsed/expanded state
function DynamicMainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const isDesktop = useIsDesktop();

  // Calculate margin: 0 on mobile, 72px collapsed / 240px expanded on desktop
  const marginLeft = isDesktop ? (isCollapsed ? 72 : 240) : 0;

  return (
    <main
      id="main-content"
      className="flex-1 transition-[margin-left] duration-300 ease-in-out"
      role="main"
      style={{ marginLeft }}
    >
      {children}
    </main>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SidebarProvider>
        <TasksProvider>
          <ChatTaskRefreshConnector>
            <CommandPaletteProvider>
              <div className="min-h-screen bg-background flex flex-col">
                <Header variant="app" />
                <div className="flex flex-1 pt-16">
                  <Sidebar />
                  <DynamicMainContent>
                    {children}
                  </DynamicMainContent>
                </div>
                <Footer variant="app" />
              </div>
            </CommandPaletteProvider>
          </ChatTaskRefreshConnector>
        </TasksProvider>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
