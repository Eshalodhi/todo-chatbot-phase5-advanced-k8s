import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Clear the access_token cookie
  response.cookies.set('access_token', '', {
    path: '/',
    maxAge: 0,
  });

  return response;
}
