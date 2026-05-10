import { NextResponse } from 'next/server';
import { readTripOverrides } from '@/lib/tripOverrideStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  const overrides = await readTripOverrides();
  return NextResponse.json({
    success: true,
    data: overrides,
  });
}
