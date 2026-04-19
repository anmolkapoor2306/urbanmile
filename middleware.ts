import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isAdminAuthenticated } from '@/lib/adminAuth';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isAuthenticated = isAdminAuthenticated(request.cookies);
  const isAdminLoginPage = path === '/admin/login';
  const isProtectedAdminPage = path === '/admin' || (path.startsWith('/admin/') && !isAdminLoginPage);
  const isProtectedBookingsApi = path === '/api/bookings' || path.startsWith('/api/bookings/');
  const isPublicBookingsApi = path === '/api/bookings/public' || path.startsWith('/api/bookings/public/');
  const isProtectedDriversApi = path === '/api/drivers' || path.startsWith('/api/drivers/');

  if (isProtectedAdminPage && !isAuthenticated) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (isAdminLoginPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (isProtectedBookingsApi && !isPublicBookingsApi && !isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isProtectedDriversApi && !isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/api/bookings',
    '/api/bookings/:path*',
    '/api/drivers',
    '/api/drivers/:path*',
  ],
};
