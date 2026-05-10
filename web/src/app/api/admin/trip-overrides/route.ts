import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentAdminAuth } from '@/lib/adminAuth';
import { readTripOverrides, writeTripOverrides } from '@/lib/tripOverrideStore';
import { sanitizeTripOverrides } from '@/lib/tripOverrides';

export async function GET(request: NextRequest) {
  const authError = await requireCurrentAdminAuth(request);
  if (authError) return authError;

  const overrides = await readTripOverrides();
  return NextResponse.json({ success: true, data: overrides });
}

export async function PUT(request: NextRequest) {
  const authError = await requireCurrentAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const overrides = sanitizeTripOverrides(body?.overrides ?? body?.data ?? body);
    const savedOverrides = await writeTripOverrides(overrides);

    return NextResponse.json({ success: true, data: savedOverrides });
  } catch (error) {
    console.error('Save trip overrides error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to save trip overrides.' },
      { status: 500 }
    );
  }
}
