import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentAdminAuth } from '@/lib/adminAuth';
import { readTripOverrides, writeTripOverrides } from '@/lib/tripOverrideStore';
import { sanitizeTripOverrides } from '@/lib/tripOverrides';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireCurrentAdminAuth(request);
  if (authError) {
    logTripOverrideApi('auth error', {
      method: 'GET',
      status: authError.status,
    });
    return authError;
  }

  try {
    const overrides = await readTripOverrides();
    logTripOverrideApi('response', {
      method: 'GET',
      status: 200,
      count: overrides.length,
    });
    return NextResponse.json({ success: true, data: overrides });
  } catch (error) {
    logTripOverrideApi('read error', serializeErrorForLogs(error));
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

export async function PUT(request: NextRequest) {
  const authError = await requireCurrentAdminAuth(request);
  if (authError) {
    logTripOverrideApi('auth error', {
      method: 'PUT',
      status: authError.status,
    });
    return authError;
  }

  try {
    const body = await request.json();
    const payload = body?.overrides ?? body?.data ?? body;
    logTripOverrideApi('request payload', {
      method: 'PUT',
      payload,
    });

    if (!Array.isArray(payload)) {
      logTripOverrideApi('validation error', {
        method: 'PUT',
        reason: 'Payload is not an array',
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid trip override payload.',
          details: process.env.NODE_ENV !== 'production' ? 'Expected an array of trip overrides.' : undefined,
        },
        { status: 400 }
      );
    }

    const overrides = sanitizeTripOverrides(payload);

    if (overrides.length !== payload.length) {
      logTripOverrideApi('validation error', {
        method: 'PUT',
        reason: 'One or more trip override rows failed validation',
        requestedCount: payload.length,
        sanitizedCount: overrides.length,
        payload,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid trip override payload.',
          details:
            process.env.NODE_ENV !== 'production'
              ? 'One or more trip overrides were missing city names, id, or Sedan Price.'
              : undefined,
        },
        { status: 400 }
      );
    }

    const savedOverrides = await writeTripOverrides(overrides);
    logTripOverrideApi('response', {
      method: 'PUT',
      status: 200,
      count: savedOverrides.length,
    });

    return NextResponse.json({ success: true, data: savedOverrides });
  } catch (error) {
    logTripOverrideApi('save error', serializeErrorForLogs(error));
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to save trip overrides.',
        details: process.env.NODE_ENV !== 'production' ? getErrorMessage(error) : undefined,
      },
      { status: 500 }
    );
  }
}

function logTripOverrideApi(event: string, payload: unknown) {
  if (event.includes('error')) {
    console.error(`[Trip Override API] ${event}`, payload);
    return;
  }

  console.info(`[Trip Override API] ${event}`, payload);
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
