import { NextResponse } from 'next/server';
import { requireCurrentAdminAuth } from '@/lib/adminAuth';

export async function GET() {
  const auth = await requireCurrentAdminAuth();
  if ('status' in auth) return auth;
  return NextResponse.json({ user: auth.session });
}

export const dynamic = 'force-dynamic';