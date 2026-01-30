import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/providers/toast-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { ChatProvider } from '@/components/providers/chat-provider';
import { FloatingChat } from '@/components/features/floating-chat';

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: {
    default: 'TaskFlow - Modern Task Management',
    template: '%s | TaskFlow',
  },
  description: 'A modern, visually stunning multi-user task management application with advanced UI/UX patterns.',
  keywords: ['task management', 'todo app', 'productivity', 'nextjs'],
  authors: [{ name: 'Phase II Team' }],
  creator: 'Phase II Team',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'TaskFlow - Modern Task Management',
    description: 'A modern, visually stunning multi-user task management application.',
    siteName: 'TaskFlow',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaskFlow - Modern Task Management',
    description: 'A modern, visually stunning multi-user task management application.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

// =============================================================================
// Root Layout
// =============================================================================

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent theme flash - default to light mode */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  // Only apply dark mode if explicitly set to dark
                  const isDark = stored === 'dark';
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="font-sans antialiased min-h-screen bg-background text-foreground"
      >
        {/* Skip to main content link for accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider defaultTheme="light" enableTransitions>
          <ToastProvider position="top-right">
            <AuthProvider>
              <ChatProvider>
                {children}
                <FloatingChat />
              </ChatProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
