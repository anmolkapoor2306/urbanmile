import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import { getDriverPhoneLookupValues } from '@/lib/driverPhone';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
});

function jsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...corsHeaders,
      ...init?.headers,
    },
  });
}

function normalizeIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes('@')) return { email: trimmed.toLowerCase(), phoneValues: [] };
  return { email: null, phoneValues: getDriverPhoneLookupValues(trimmed) };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse({ error: parsed.error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
    }

    const identifier = normalizeIdentifier(parsed.data.identifier);
    const driver = await prisma.driver.findFirst({
      where: identifier.email
        ? { email: identifier.email }
        : identifier.phoneValues.length > 0
          ? {
              OR: identifier.phoneValues.map((phone) => ({ phone })),
            }
          : { id: '__NO_PHONE_MATCH__' },
      select: {
        id: true,
        driverCode: true,
        fullName: true,
        name: true,
        email: true,
        phone: true,
        passwordHash: true,
        status: true,
        dutyStatus: true,
        vehicleNumber: true,
        vehicleType: true,
      },
    });

    if (!driver?.passwordHash) {
      return jsonResponse({ error: 'Invalid email/phone or password.' }, { status: 401 });
    }

    if (driver.status !== 'ACTIVE') {
      return jsonResponse({ error: 'Driver account is not active.' }, { status: 403 });
    }

    const matches = await verifyPassword(parsed.data.password, driver.passwordHash);
    if (!matches) {
      return jsonResponse({ error: 'Invalid email/phone or password.' }, { status: 401 });
    }

    await prisma.driver.update({
      where: { id: driver.id },
      data: {
        lastLoginAt: new Date(),
        dutyStatus: 'OFFLINE',
        availabilityStatus: 'OFFLINE',
      },
    });

    return jsonResponse({
      success: true,
      token: randomBytes(32).toString('hex'),
      driver: {
        id: driver.id,
        driverCode: driver.driverCode,
        fullName: driver.fullName || driver.name,
        email: driver.email,
        phone: driver.phone,
        dutyStatus: 'OFFLINE',
        vehicleNumber: driver.vehicleNumber,
        vehicleType: driver.vehicleType,
      },
    });
  } catch (error) {
    console.error('Driver login error:', error);
    return jsonResponse({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export const dynamic = 'force-dynamic';
