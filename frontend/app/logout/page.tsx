'use client';

import { useEffect, useState } from 'react';

export default function LogoutPage() {
  const [status, setStatus] = useState('Clearing session...');

  useEffect(() => {
    const clearEverything = async () => {
      try {
        // Clear all localStorage
        localStorage.clear();
        setStatus('Cleared localStorage...');

        // Clear all sessionStorage
        sessionStorage.clear();
        setStatus('Cleared sessionStorage...');

        // Clear access_token cookie specifically with multiple path variations
        const cookiesToClear = ['access_token', 'token', 'user', 'session'];
        const paths = ['/', '/dashboard', '/login', '/register', ''];

        cookiesToClear.forEach(name => {
          paths.forEach(path => {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}; domain=${window.location.hostname}`;
          });
        });

        // Also clear all cookies using the general approach
        document.cookie.split(";").forEach((c) => {
          const name = c.split("=")[0].trim();
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        });

        setStatus('Cleared cookies...');

        // Call logout API
        await fetch('/api/auth/logout', { method: 'POST' });
        setStatus('Called logout API...');

        // Wait a moment then redirect
        setStatus('Redirecting to login...');

        // Use window.location.replace for a clean redirect
        setTimeout(() => {
          window.location.replace('/login');
        }, 1000);
      } catch (error) {
        console.error('Logout error:', error);
        setStatus('Error during logout, redirecting anyway...');
        setTimeout(() => {
          window.location.replace('/login');
        }, 1000);
      }
    };

    clearEverything();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center p-8 bg-card rounded-lg shadow-lg border border-border">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground">Logging out...</p>
        <p className="text-sm text-muted-foreground mt-2">{status}</p>
      </div>
    </div>
  );
}
