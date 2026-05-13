import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminCredentials, createAdminSession } from '@/lib/adminAuthPrisma';
import { createSignedSession, signSessionToken } from '@/lib/sessionToken';
import { setAdminSessionCookie } from '@/lib/adminAuth';
import { writeAuditLog, auditFromRequest } from '@/lib/auditLog';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email or username and password are required' }, { status: 400 });
    }

    const result = await verifyAdminCredentials(email, password);
    if (!result || !result.user) {
      return NextResponse.json({ error: 'Invalid credentials. Please check your email or username and password.' }, { status: 401 });
    }

    const { user } = result;

    const dbSession = await createAdminSession(
      user.id,
      user.role,
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
      request.headers.get('user-agent') || undefined,
    );

    const session = createSignedSession({
      userId: user.id,
      role: user.role,
      sessionId: dbSession.token,
    });
    const token = await signSessionToken(session);

    await writeAuditLog({
      ...auditFromRequest(user.id, 'login', 'user', request),
      action: 'login',
      entityType: 'user',
      entityId: user.id,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    setAdminSessionCookie(response, token);
    return response;
  } catch (error) {
    console.warn('Admin login error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Admin login is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}

export const dynamic = 'force-dynamic';
