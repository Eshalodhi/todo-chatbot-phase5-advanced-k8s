import { createAuthClient } from 'better-auth/react';

// =============================================================================
// Better Auth Client Configuration
// =============================================================================

/**
 * Initialize Better Auth client for the frontend.
 * This handles authentication flows with the backend.
 */
export const authClient = createAuthClient({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000/api/auth',
});

// Export commonly used methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

// =============================================================================
// Auth Helper Functions
// =============================================================================

/**
 * Get the current user's JWT access token from storage.
 * This token is attached to API requests for authentication.
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

/**
 * Store the JWT access token.
 */
export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', token);
}

/**
 * Clear the stored access token.
 */
export function clearAccessToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('access_token');
}

/**
 * Check if user is authenticated (has valid token).
 */
export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
