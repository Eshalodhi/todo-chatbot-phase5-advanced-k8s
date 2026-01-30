import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error from GitHub
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/callback?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/auth/callback?error=Missing OAuth parameters', request.url)
      );
    }

    // Forward to backend OAuth callback
    const backendCallbackUrl = `${BACKEND_URL}/auth/callback/github?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
    const response = await fetch(backendCallbackUrl, {
      redirect: 'manual', // Don't follow redirects automatically
    });

    // Backend should redirect with token
    if (response.status === 307 || response.status === 302) {
      const location = response.headers.get('location');
      if (location) {
        return NextResponse.redirect(location);
      }
    }

    // If backend returns error
    if (!response.ok) {
      const data = await response.json().catch(() => ({ detail: 'OAuth failed' }));
      return NextResponse.redirect(
        new URL(`/auth/callback?error=${encodeURIComponent(data.detail || 'OAuth failed')}`, request.url)
      );
    }

    // Fallback - shouldn't reach here normally
    return NextResponse.redirect(new URL('/auth/callback?error=Unexpected response', request.url));
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/callback?error=Internal server error', request.url)
    );
  }
}
