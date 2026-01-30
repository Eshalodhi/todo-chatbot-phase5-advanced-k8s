import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { email, password, remember_me } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Call backend auth API
    const response = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, remember_me: remember_me || false }),
    });

    // Handle non-JSON responses (backend error pages)
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      console.error('Backend returned non-JSON:', text.substring(0, 200));
      return NextResponse.json(
        { error: 'Backend server error. Check backend logs.' },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      // Return generic error to prevent email enumeration
      return NextResponse.json(
        { error: data.detail || 'Invalid email or password' },
        { status: response.status }
      );
    }

    // Return user and token from backend
    return NextResponse.json({
      user: data.user,
      token: data.token,
    });
  } catch (error) {
    console.error('Login error:', error);
    // Provide more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed');
    return NextResponse.json(
      { error: isConnectionError ? 'Cannot connect to backend server. Is it running?' : errorMessage },
      { status: 500 }
    );
  }
}
