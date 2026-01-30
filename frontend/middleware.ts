import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard'];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register'];

// Routes that should always be accessible (no auth check)
const publicRoutes = ['/logout'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // For /logout, clear the cookie and allow access
  if (pathname === '/logout' || pathname.startsWith('/logout')) {
    const response = NextResponse.next();
    // Clear the access_token cookie server-side
    response.cookies.set('access_token', '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
    return response;
  }

  // Allow other public routes without any checks
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for auth token in cookies or headers
  // In a real app, you'd verify the JWT token here
  const token = request.cookies.get('access_token')?.value;

  // For protected routes, redirect to login if not authenticated
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // For auth routes, redirect to dashboard if already authenticated
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
