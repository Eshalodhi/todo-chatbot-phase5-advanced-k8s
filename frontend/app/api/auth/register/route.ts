import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  console.log('[Register API] Request received');
  try {
    const { name, email, password } = await request.json();
    console.log('[Register API] Parsed body:', { name, email, password: '***' });

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Validate password length on frontend too
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Call backend auth API
    console.log('[Register API] Calling backend:', `${BACKEND_URL}/auth/register`);
    const response = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    console.log('[Register API] Backend response status:', response.status);

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
    console.log('[Register API] Backend data:', JSON.stringify(data));

    if (!response.ok) {
      console.log('[Register API] Backend error:', data.detail);
      return NextResponse.json(
        { error: data.detail || 'Registration failed' },
        { status: response.status }
      );
    }

    // Return user and token from backend (auto-login after registration)
    console.log('[Register API] Success, returning user and token');
    return NextResponse.json({
      user: data.user,
      token: data.token,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const isConnectionError = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed');
    return NextResponse.json(
      { error: isConnectionError ? 'Cannot connect to backend server. Is it running?' : errorMessage },
      { status: 500 }
    );
  }
}
