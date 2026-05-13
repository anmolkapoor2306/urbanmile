import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearAdminSessionCookie, parseAdminSession } from '@/lib/adminAuth';
import { deleteAdminSessionByToken } from '@/lib/adminAuthPrisma';

export async function POST() {
  const cookieStore = await cookies();
  const session = await parseAdminSession(cookieStore);

  if (session) {
    await deleteAdminSessionByToken(session.sessionId);
  }

  const response = NextResponse.json({ success: true });
  clearAdminSessionCookie(response);
  return response;
}

export const dynamic = 'force-dynamic';
