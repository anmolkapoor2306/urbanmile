import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  clearCustomerSessionCookie,
  deleteCustomerSession,
  parseCustomerSession,
} from '@/lib/customerAccountAuth';

export async function POST() {
  const cookieStore = await cookies();
  const session = await parseCustomerSession(cookieStore);

  if (session) {
    await deleteCustomerSession(session.sessionId);
  }

  const response = NextResponse.json({ success: true });
  clearCustomerSessionCookie(response);
  return response;
}

export const dynamic = 'force-dynamic';
