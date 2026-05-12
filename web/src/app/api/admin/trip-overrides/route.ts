import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireCurrentAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'tripoverrides:read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { readTripOverrides, writeTripOverrides } = await import('@/lib/tripOverrideStore');

  try {
    const overrides = await readTripOverrides();
    return NextResponse.json({ success: true, data: overrides });
  } catch (error) {
    console.error('[Trip Override API] read error', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load trip overrides.', details: process.env.NODE_ENV !== 'production' ? String(error) : undefined },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireCurrentAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'tripoverrides:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { readTripOverrides, writeTripOverrides } = await import('@/lib/tripOverrideStore');
  const { sanitizeTripOverrides } = await import('@/lib/tripOverrides');

  try {
    const body = await request.json();
    const payload = body?.overrides ?? body?.data ?? body;

    if (!Array.isArray(payload)) {
      return NextResponse.json(
        { success: false, error: 'Invalid trip override payload.', details: process.env.NODE_ENV !== 'production' ? 'Expected an array of trip overrides.' : undefined },
        { status: 400 }
      );
    }

    const overrides = sanitizeTripOverrides(payload);

    if (overrides.length !== payload.length) {
      return NextResponse.json(
        { success: false, error: 'Invalid trip override payload.', details: process.env.NODE_ENV !== 'production' ? 'One or more trip overrides were missing city names, id, or Sedan Price.' : undefined },
        { status: 400 }
      );
    }

    const savedOverrides = await writeTripOverrides(overrides);
    return NextResponse.json({ success: true, data: savedOverrides });
  } catch (error) {
    console.error('[Trip Override API] save error', error);
    return NextResponse.json(
      { success: false, error: 'Unable to save trip overrides.', details: process.env.NODE_ENV !== 'production' ? String(error) : undefined },
      { status: 500 }
    );
  }
}