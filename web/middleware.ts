import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { isAdminAuthenticated } from '@/lib/adminAuth';
import { CUSTOMER_SESSION_COOKIE_NAME, verifyCustomerSessionToken } from '@/lib/customerSessionToken';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const session = await isAdminAuthenticated(request.cookies);
  const customerSessionCookie = request.cookies.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
  const customerSession = customerSessionCookie ? await verifyCustomerSessionToken(customerSessionCookie) : null;
  const isAdminLoginPage = path === '/admin/login';
  const isProtectedAdminPage = path === '/admin' || (path.startsWith('/admin/') && !isAdminLoginPage);
  const isProtectedCustomerPage = path === '/customer' || path.startsWith('/customer/');
  const isProtectedBookingsApi = path === '/api/bookings' || path.startsWith('/api/bookings/');
  const isPublicBookingsApi = path === '/api/bookings/public' || path.startsWith('/api/bookings/public/');
  const isProtectedDriversApi = path === '/api/drivers' || path.startsWith('/api/drivers/');

  if (isProtectedAdminPage && !session) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  if (isAdminLoginPage && session) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (isProtectedCustomerPage && !customerSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isProtectedBookingsApi && !isPublicBookingsApi && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isProtectedDriversApi && !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/customer',
    '/customer/:path*',
    '/api/bookings',
    '/api/bookings/:path*',
    '/api/drivers',
    '/api/drivers/:path*',
  ],
};
