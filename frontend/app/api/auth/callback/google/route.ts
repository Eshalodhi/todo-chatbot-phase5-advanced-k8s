import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle OAuth error from Google
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/callback?error=${encodeURIComponent(error)}`, FRONTEND_URL)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/auth/callback?error=Missing authorization code', FRONTEND_URL)
      );
    }

    // Exchange code with backend
    const response = await fetch(`${BACKEND_URL}/auth/google/callback?code=${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ detail: 'OAuth failed' }));
      return NextResponse.redirect(
        new URL(`/auth/callback?error=${encodeURIComponent(data.detail || 'OAuth failed')}`, FRONTEND_URL)
      );
    }

    // Get token from backend response
    const data = await response.json();
    const token = data.token;

    if (!token) {
      return NextResponse.redirect(
        new URL('/auth/callback?error=No token received', FRONTEND_URL)
      );
    }

    // Redirect to callback page with token
    return NextResponse.redirect(
      new URL(`/auth/callback?token=${encodeURIComponent(token)}&provider=google`, FRONTEND_URL)
    );
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/callback?error=Internal server error', FRONTEND_URL)
    );
  }
}
