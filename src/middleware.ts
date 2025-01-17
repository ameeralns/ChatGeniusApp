import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    '/workspace/:path*',
    '/api/admin/:path*',
    '/login'
  ]
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get('auth');

  // Handle admin API routes
  if (pathname.startsWith('/api/admin')) {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.split('Bearer ')[1];
      if (!token) {
        return NextResponse.json({ error: 'No token provided' }, { status: 401 });
      }

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-auth-token', token);

      const newRequest = new Request(request.url, {
        method: request.method,
        headers: requestHeaders,
        body: request.body
      });

      return NextResponse.next({
        request: newRequest,
      });
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  // Handle authentication for workspace routes
  if (pathname.startsWith('/workspace')) {
    if (!authCookie?.value) {
      const url = new URL('/login', request.url);
      url.searchParams.set('from', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Handle /login route - redirect to workspace if already authenticated
  if (pathname === '/login') {
    if (authCookie?.value) {
      const from = request.nextUrl.searchParams.get('from');
      const url = new URL(from || '/workspace/welcome', request.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
} 