import { NextResponse } from 'next/server';

// GET endpoint for easy browser navigation to clear cookies
export async function GET() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));

  // Clear the access_token cookie with all variations
  response.cookies.set('access_token', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set('token', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Auth cleared' });

  // Clear the access_token cookie
  response.cookies.set('access_token', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  response.cookies.set('token', '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
