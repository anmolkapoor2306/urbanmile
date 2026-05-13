import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type AdminSessionPayload,
} from '@/lib/sessionToken';

type AdminCookieReader = {
  get(name: string): { value: string } | undefined;
};

const clearedCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  expires: new Date(0),
  maxAge: 0,
};

export async function parseAdminSession(cookieStore: AdminCookieReader): Promise<AdminSessionPayload | null> {
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie) return null;
  return verifySessionToken(sessionCookie.value);
}

export async function getCurrentAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const session = await parseAdminSession(cookieStore);
  return verifyAdminSessionInDatabase(session);
}

export async function isCurrentAdminAuthenticated(): Promise<boolean> {
  return (await getCurrentAdminSession()) !== null;
}

export async function getCurrentAdminCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.toString();
}

export async function clearCurrentAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', clearedCookieOptions);
}

export async function isAdminAuthenticated(cookieStore: AdminCookieReader): Promise<AdminSessionPayload | null> {
  return parseAdminSession(cookieStore);
}

export async function requireAdminAuth(request: NextRequest): Promise<{ session: AdminSessionPayload } | NextResponse> {
  const session = await verifyAdminSessionInDatabase(await parseAdminSession(request.cookies));
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return { session };
}

export async function requireCurrentAdminAuth(request?: NextRequest): Promise<{ session: AdminSessionPayload } | NextResponse> {
  if (request) {
    const session = await verifyAdminSessionInDatabase(await parseAdminSession(request.cookies));
    if (session) return { session };
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getCurrentAdminSession();
  if (session) return { session };
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export async function checkAdminAuth(request: NextRequest): Promise<AdminSessionPayload | null> {
  return verifyAdminSessionInDatabase(await parseAdminSession(request.cookies));
}

export function setAdminSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 3600,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', clearedCookieOptions);
}

export async function validateAdminSession(request: NextRequest): Promise<AdminSessionPayload | null> {
  return verifyAdminSessionInDatabase(await parseAdminSession(request.cookies));
}

async function verifyAdminSessionInDatabase(
  session: AdminSessionPayload | null,
): Promise<AdminSessionPayload | null> {
  if (!session) return null;

  try {
    const { validateSessionTokenInDB } = await import('@/lib/adminAuthPrisma');
    const dbSession = await validateSessionTokenInDB(session.sessionId);

    if (!dbSession || dbSession.expiresAt <= new Date() || !dbSession.user.isActive) {
      return null;
    }

    return {
      ...session,
      userId: dbSession.userId,
      role: dbSession.user.role,
    };
  } catch (error) {
    console.error('Failed to validate admin session:', error);
    return null;
  }
}
