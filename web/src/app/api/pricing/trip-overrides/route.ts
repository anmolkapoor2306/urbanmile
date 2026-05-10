import { NextResponse } from 'next/server';
import { readTripOverrides } from '@/lib/tripOverrideStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const overrides = await readTripOverrides();
    console.info('[Trip Override Public API] response', {
      status: 200,
      count: overrides.length,
    });

    return NextResponse.json({
      success: true,
      data: overrides,
    });
  } catch (error) {
    console.error('[Trip Override Public API] read error', serializeErrorForLogs(error));
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to load trip overrides.',
        details: process.env.NODE_ENV !== 'production' ? getErrorMessage(error) : undefined,
      },
      { status: 500 }
    );
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function serializeErrorForLogs(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}
