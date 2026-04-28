import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = 'admin_session';
export const ADMIN_COOKIE_VALUE = 'authenticated';
export const ADMIN_COOKIE_MAX_AGE = 3600;

type AdminCookieReader = {
  get(name: string): { value: string } | undefined;
};

const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function getClearedAdminCookieOptions() {
  return {
    ...adminCookieOptions,
    expires: new Date(0),
    maxAge: 0,
  };
}

export function isAdminAuthenticated(cookieStore: AdminCookieReader): boolean {
  const adminSession = cookieStore.get(ADMIN_COOKIE_NAME);
  return adminSession?.value === ADMIN_COOKIE_VALUE;
}

export async function isCurrentAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return isAdminAuthenticated(cookieStore);
}

export async function getCurrentAdminCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.toString();
}

export async function clearCurrentAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, '', getClearedAdminCookieOptions());
}

export function requireAdminAuth(request: NextRequest): NextResponse | null {
  if (!isAdminAuthenticated(request.cookies)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export function checkAdminAuth(request: NextRequest): boolean {
  return isAdminAuthenticated(request.cookies);
}

export function setAdminSession(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE, {
    ...adminCookieOptions,
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
}

export function clearAdminSession(response: NextResponse): void {
  response.cookies.set(ADMIN_COOKIE_NAME, '', getClearedAdminCookieOptions());
}

export function validateAdminSession(request: NextRequest): boolean {
  return isAdminAuthenticated(request.cookies);
}
