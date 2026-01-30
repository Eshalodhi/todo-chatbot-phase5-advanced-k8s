'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User, AuthContextValue } from '@/types';
import { useToast } from './toast-provider';

// =============================================================================
// Auth Context
// =============================================================================

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

// =============================================================================
// useAuth Hook
// =============================================================================

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// =============================================================================
// Auth Provider Props
// =============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

// =============================================================================
// Auth Provider
// =============================================================================

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { success, error: showError } = useToast();

  const [user, setUser] = React.useState<User | null>(null);
  // Start with false to avoid hydration mismatch, then set true during client-side check
  const [isLoading, setIsLoading] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  // Check for existing session on mount (client-side only)
  React.useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Session check failed:', err);
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    };

    checkSession();
  }, []);

  // Helper function to store auth data
  const storeAuthData = React.useCallback((userData: User, token: string, rememberMe: boolean = false) => {
    localStorage.setItem('access_token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    // Cookie expiration based on remember me
    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days or 1 day
    document.cookie = `access_token=${token}; path=/; max-age=${maxAge}`;

    setUser(userData);
  }, []);

  // Login function - calls real API to get JWT
  const login = React.useCallback(async (email: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const { user: userData, token } = data;
      storeAuthData(userData, token, rememberMe);

      success('Welcome back! Logged in successfully.');
      router.push('/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      showError(err instanceof Error ? err.message : 'Invalid email or password. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [router, success, showError, storeAuthData]);

  // Register function - calls real API to create user and get JWT
  const register = React.useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      const { user: userData, token } = data;
      storeAuthData(userData, token, false);

      success('Account created successfully!');
      router.push('/dashboard');
    } catch (err) {
      console.error('Registration failed:', err);
      showError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [router, success, showError, storeAuthData]);

  // Logout function
  const logout = React.useCallback(async () => {
    // Call logout API to clear server-side cookie
    await fetch('/api/auth/logout', { method: 'POST' });

    // Clear storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    // Clear cookie (client-side backup)
    document.cookie = 'access_token=; path=/; max-age=0';

    setUser(null);
    success('Logged out successfully.');
    router.push('/');
  }, [router, success]);

  // OAuth login - redirects to OAuth provider
  const loginWithOAuth = React.useCallback((provider: 'google' | 'github') => {
    if (provider === 'google') {
      // Redirect to backend Google OAuth endpoint
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      window.location.href = `${backendUrl}/auth/google`;
    } else {
      showError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not configured yet.`);
    }
  }, [showError]);

  // Forgot password - shows message that it's not configured yet
  const forgotPassword = React.useCallback(async (email: string) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Always show success to prevent email enumeration
    success('If an account exists with this email, you will receive a password reset link.');
  }, [success]);

  // Reset password - shows message that it's not configured yet
  const resetPassword = React.useCallback(async (token: string, password: string) => {
    showError('Password reset is not configured yet. Please contact support.');
    throw new Error('Password reset not configured');
  }, [showError]);

  // Handle OAuth callback - saves token and user data
  const handleOAuthCallback = React.useCallback(async (token: string) => {
    try {
      // Decode the JWT to get user info (basic decode, not verification)
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));

      // Create user object from token payload
      const userData: User = {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
      };

      // Use storeAuthData to properly persist auth (fixes key mismatch)
      storeAuthData(userData, token, true);

      success('Signed in successfully!');
      router.push('/dashboard');
    } catch (error) {
      showError('Failed to complete sign in. Please try again.');
      throw error;
    }
  }, [router, success, showError, storeAuthData]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      loginWithOAuth,
      forgotPassword,
      resetPassword,
      handleOAuthCallback,
    }),
    [user, isLoading, login, register, logout, loginWithOAuth, forgotPassword, resetPassword, handleOAuthCallback]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
// Protected Route Wrapper
// =============================================================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
