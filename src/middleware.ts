import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const isWorkspacePath = request.nextUrl.pathname.startsWith('/workspace');
  const isLoginPath = request.nextUrl.pathname === '/login';
  const isRootPath = request.nextUrl.pathname === '/';

  // If authenticated and trying to access login or root, redirect to welcome page
  if (authCookie && (isLoginPath || isRootPath)) {
    return NextResponse.redirect(new URL('/workspace/welcome', request.url));
  }

  // If trying to access workspace routes without auth, redirect to login
  if (isWorkspacePath && !authCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 