import { NextRequest, NextResponse } from 'next/server';
import { CarType, DriverAvailability, DriverType, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import { driverRecordSelect, serializeDriver } from '@/lib/driverRecord';
import { generateDriverCode, backfillDriverCodes } from '@/lib/driverCode';

const defaultDriverType = DriverType.OWN;
const defaultVehicleType = CarType.SEDAN;
const defaultAvailabilityStatus = DriverAvailability.OFFLINE;

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

const createDriverSchema = z.object({
  name: z.string().trim().min(2, 'Driver name is required'),
  phone: z.string().trim().min(7, 'Phone number is required'),
  email: z.preprocess(normalizeOptionalString, z.string().email('Please enter a valid email').optional()),
  licenseInfo: z.preprocess(normalizeOptionalString, z.string().optional()),
  notes: z.preprocess(normalizeOptionalString, z.string().optional()),
});

const updateDriverSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2, 'Driver name is required').optional(),
  phone: z.string().trim().min(7, 'Phone number is required').optional(),
  email: z.preprocess(normalizeOptionalString, z.string().email('Please enter a valid email').optional()),
  availabilityStatus: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).optional(),
  licenseInfo: z.preprocess(normalizeOptionalString, z.string().optional()),
  vendorId: z.string().uuid().optional().or(z.literal('')),
  notes: z.preprocess(normalizeOptionalString, z.string().optional()),
  isActive: z.boolean().optional(),
});

function buildDefaultVehicleNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 0 ? `PENDING-${digits}` : `PENDING-${Date.now()}`;
}

function isUniqueConstraintError(error: unknown, field?: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    (!field || (Array.isArray(error.meta?.target) && error.meta?.target.includes(field)))
  );
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      if (Array.isArray(error.meta?.target) && error.meta.target.includes('driverCode')) {
        return 'Could not allocate a unique driver code. Please try again.';
      }

      return 'A unique driver field conflicts with an existing record.';
    }

    if (error.code === 'P2003') {
      return 'The selected related record is invalid or no longer exists.';
    }

    return error.message;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return error.message.split('\n')[0] || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'drivers:read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const drivers = await prisma.driver.findMany({
      select: driverRecordSelect,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: drivers.map(serializeDriver) });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'drivers:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = createDriverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
    }

    let driver = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const driverCode = await generateDriverCode(prisma, defaultDriverType);

      try {
        driver = await prisma.driver.create({
          data: {
            driverCode,
            name: parsed.data.name,
            phone: parsed.data.phone,
            email: parsed.data.email ?? null,
            vehicleType: defaultVehicleType,
            vehicleNumber: buildDefaultVehicleNumber(parsed.data.phone),
            isActive: true,
            driverType: defaultDriverType,
            availabilityStatus: defaultAvailabilityStatus,
            licenseInfo: parsed.data.licenseInfo ?? null,
            notes: parsed.data.notes ?? null,
          },
          select: driverRecordSelect,
        });

        break;
      } catch (error) {
        if (attempt < 2 && isUniqueConstraintError(error, 'driverCode')) {
          continue;
        }

        throw error;
      }
    }

    if (!driver) {
      throw new Error('Unable to create driver record.');
    }

    return NextResponse.json(
      { success: true, message: 'Driver created successfully.', data: serializeDriver(driver) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating driver:', error);
    return NextResponse.json({ error: getApiErrorMessage(error, 'Failed to create driver') }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'drivers:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = updateDriverSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
    }

    const driverId = parsed.data.id;
    if (!driverId) {
      return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
    }

    const existingDriver = await prisma.driver.findUnique({
      where: { id: driverId },
      select: driverRecordSelect,
    });

    if (!existingDriver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    const hasChanged = Object.keys(parsed.data).some(
      (key) => key !== 'id' && parsed.data[key as keyof typeof parsed.data] !== undefined
    );

    if (!hasChanged) {
      return NextResponse.json({ success: true, message: 'No driver changes were submitted.', data: serializeDriver(existingDriver) });
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email ?? null;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
    if (parsed.data.availabilityStatus !== undefined) updateData.availabilityStatus = parsed.data.availabilityStatus;
    if (parsed.data.licenseInfo !== undefined) updateData.licenseInfo = parsed.data.licenseInfo ?? null;
    if (parsed.data.vendorId !== undefined) updateData.vendorId = parsed.data.vendorId || null;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes ?? null;

    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: updateData,
      select: driverRecordSelect,
    });

    return NextResponse.json({ success: true, message: 'Driver updated successfully.', data: serializeDriver(updated) });
  } catch (error) {
    console.error('Error updating driver:', error);
    return NextResponse.json({ error: getApiErrorMessage(error, 'Failed to update driver') }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'drivers:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
  }

  try {
    await prisma.driver.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting driver:', error);
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
  }
}

export async function POSTBackfill(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'drivers:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = await backfillDriverCodes(prisma);
    return NextResponse.json({ success: true, message: 'Driver codes backfilled', data: result });
  } catch (error) {
    console.error('Error backfilling codes:', error);
    return NextResponse.json({ error: 'Failed to backfill codes' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';