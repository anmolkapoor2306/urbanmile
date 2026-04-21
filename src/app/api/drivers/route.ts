import { NextRequest, NextResponse } from 'next/server';
import { CarType, DriverAvailability, DriverType, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
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
  const authError = requireAdminAuth(request);
  if (authError) return authError;

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
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const result = createDriverSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 }
      );
    }

    let driver = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const driverCode = await generateDriverCode(prisma, defaultDriverType);

      try {
        driver = await prisma.driver.create({
          data: {
            driverCode,
            name: result.data.name,
            phone: result.data.phone,
            email: result.data.email ?? null,
            vehicleType: defaultVehicleType,
            vehicleNumber: buildDefaultVehicleNumber(result.data.phone),
            isActive: true,
            driverType: defaultDriverType,
            availabilityStatus: defaultAvailabilityStatus,
            licenseInfo: result.data.licenseInfo ?? null,
            notes: result.data.notes ?? null,
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
    return NextResponse.json(
      { error: getApiErrorMessage(error, 'Failed to create driver') },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const result = updateDriverSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 }
      );
    }

    const driverId = result.data.id;
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

    const hasChanged = Object.keys(result.data).some(
      (key) => key !== 'id' && result.data[key as keyof typeof result.data] !== undefined
    );

    if (!hasChanged) {
      return NextResponse.json({ success: true, message: 'No driver changes were submitted.', data: serializeDriver(existingDriver) });
    }

    const updateData: Record<string, unknown> = {};

    if (result.data.name !== undefined) updateData.name = result.data.name;
    if (result.data.phone !== undefined) updateData.phone = result.data.phone;
    if (result.data.email !== undefined) updateData.email = result.data.email ?? null;
    if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;
    if (result.data.availabilityStatus !== undefined) updateData.availabilityStatus = result.data.availabilityStatus;
    if (result.data.licenseInfo !== undefined) updateData.licenseInfo = result.data.licenseInfo ?? null;
    if (result.data.vendorId !== undefined) updateData.vendorId = result.data.vendorId || null;
    if (result.data.notes !== undefined) updateData.notes = result.data.notes ?? null;

    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: updateData,
      select: driverRecordSelect,
    });

    return NextResponse.json({ success: true, message: 'Driver updated successfully.', data: serializeDriver(updated) });
  } catch (error) {
    console.error('Error updating driver:', error);
    return NextResponse.json(
      { error: getApiErrorMessage(error, 'Failed to update driver') },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });
  }

  try {
    await prisma.driver.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting driver:', error);
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
  }
}

export async function POSTBackfill(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const result = await backfillDriverCodes(prisma);
    return NextResponse.json({
      success: true,
      message: 'Driver codes backfilled',
      data: result,
    });
  } catch (error) {
    console.error('Error backfilling codes:', error);
    return NextResponse.json({ error: 'Failed to backfill codes' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
