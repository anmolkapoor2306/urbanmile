import { NextRequest, NextResponse } from 'next/server';
import { CarType, DriverDutyStatus, DriverStatus, DriverType, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import { driverRecordSelect, serializeDriver } from '@/lib/driverRecord';
import { generateDriverCode, backfillDriverCodes } from '@/lib/driverCode';
import { hashPassword } from '@/lib/password';
import { formatIndianDriverPhone } from '@/lib/driverPhone';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

const driverTypeSchema = z.enum(['OWN_DRIVER', 'VENDOR_DRIVER']);
const driverStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
const vehicleTypeSchema = z.enum(['SEDAN', 'SUV', 'PREMIUM']).nullable().optional();

const createDriverSchema = z.object({
  fullName: z.string().trim().min(2, 'Driver name is required'),
  phone: z.string().trim().min(7, 'Phone number is required'),
  email: z.preprocess(normalizeOptionalString, z.string().email('Please enter a valid email').optional()),
  password: passwordSchema,
  status: driverStatusSchema.default('ACTIVE'),
  driverType: driverTypeSchema.default('OWN_DRIVER'),
  vehicleNumber: z.preprocess(normalizeOptionalString, z.string().optional()),
  vehicleType: vehicleTypeSchema,
  licenseInfo: z.preprocess(normalizeOptionalString, z.string().optional()),
  notes: z.preprocess(normalizeOptionalString, z.string().optional()),
});

const updateDriverSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().trim().min(2, 'Driver name is required').optional(),
  phone: z.string().trim().min(7, 'Phone number is required').optional(),
  email: z.preprocess(normalizeOptionalString, z.string().email('Please enter a valid email').optional()),
  password: passwordSchema.optional(),
  status: driverStatusSchema.optional(),
  driverType: driverTypeSchema.optional(),
  vehicleNumber: z.preprocess(normalizeOptionalString, z.string().optional()),
  vehicleType: vehicleTypeSchema,
  licenseInfo: z.preprocess(normalizeOptionalString, z.string().optional()),
  notes: z.preprocess(normalizeOptionalString, z.string().optional()),
});

function toLegacyDriverType(driverType: 'OWN_DRIVER' | 'VENDOR_DRIVER') {
  return driverType === 'VENDOR_DRIVER' ? DriverType.VENDOR_DRIVER : DriverType.OWN_DRIVER;
}

function toLegacyAvailability(dutyStatus: 'ONLINE' | 'OFFLINE' | 'BREAK' | 'ON_TRIP') {
  if (dutyStatus === 'ONLINE') return 'AVAILABLE' as const;
  if (dutyStatus === 'ON_TRIP') return 'BUSY' as const;
  return 'OFFLINE' as const;
}

function toLegacyCarType(vehicleType: 'SEDAN' | 'SUV' | 'PREMIUM' | null | undefined) {
  if (!vehicleType) return null;
  return vehicleType === 'PREMIUM' ? CarType.PREMIUM : (vehicleType as CarType);
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return 'A driver with this phone, email, or code already exists.';
    if (error.code === 'P2003') return 'The selected related record is invalid or no longer exists.';
    return error.message;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'drivers:read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const drivers = await prisma.driver.findMany({
      select: driverRecordSelect,
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
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
    const passwordHash = await hashPassword(parsed.data.password);
    let normalizedPhone: string;

    try {
      normalizedPhone = formatIndianDriverPhone(parsed.data.phone);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        driver = await prisma.driver.create({
          data: {
            driverCode: await generateDriverCode(prisma),
            fullName: parsed.data.fullName,
            name: parsed.data.fullName,
            phone: normalizedPhone,
            email: parsed.data.email?.toLowerCase() ?? null,
            passwordHash,
            status: parsed.data.status as DriverStatus,
            dutyStatus: DriverDutyStatus.OFFLINE,
            isActive: parsed.data.status === 'ACTIVE',
            driverType: toLegacyDriverType(parsed.data.driverType),
            availabilityStatus: toLegacyAvailability('OFFLINE'),
            vehicleType: toLegacyCarType(parsed.data.vehicleType),
            vehicleNumber: parsed.data.vehicleNumber ?? null,
            licenseInfo: parsed.data.licenseInfo ?? null,
            notes: parsed.data.notes ?? null,
          },
          select: driverRecordSelect,
        });
        break;
      } catch (error) {
        if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') continue;
        throw error;
      }
    }

    if (!driver) throw new Error('Unable to create driver record.');

    return NextResponse.json({ success: true, message: 'Driver created successfully.', data: serializeDriver(driver) }, { status: 201 });
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

    const existingDriver = await prisma.driver.findUnique({ where: { id: parsed.data.id }, select: driverRecordSelect });
    if (!existingDriver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });

    const updateData: Prisma.DriverUpdateInput = {};

    if (parsed.data.fullName !== undefined) {
      updateData.fullName = parsed.data.fullName;
      updateData.name = parsed.data.fullName;
    }
    if (parsed.data.phone !== undefined) {
      try {
        updateData.phone = formatIndianDriverPhone(parsed.data.phone);
      } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 });
      }
    }
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email?.toLowerCase() ?? null;
    if (parsed.data.password !== undefined) updateData.passwordHash = await hashPassword(parsed.data.password);
    if (parsed.data.status !== undefined) {
      updateData.status = parsed.data.status as DriverStatus;
      updateData.isActive = parsed.data.status === 'ACTIVE';
      if (parsed.data.status !== 'ACTIVE') {
        updateData.dutyStatus = DriverDutyStatus.OFFLINE;
        updateData.availabilityStatus = 'OFFLINE';
      }
    }
    if (parsed.data.driverType !== undefined) updateData.driverType = toLegacyDriverType(parsed.data.driverType);
    if (parsed.data.vehicleType !== undefined) updateData.vehicleType = toLegacyCarType(parsed.data.vehicleType);
    if (parsed.data.vehicleNumber !== undefined) updateData.vehicleNumber = parsed.data.vehicleNumber ?? null;
    if (parsed.data.licenseInfo !== undefined) updateData.licenseInfo = parsed.data.licenseInfo ?? null;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes ?? null;

    const updated = await prisma.driver.update({
      where: { id: parsed.data.id },
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
  if (!id) return NextResponse.json({ error: 'Driver ID is required' }, { status: 400 });

  try {
    const linkedBooking = await prisma.booking.findFirst({ where: { driverId: id }, select: { id: true } });

    if (linkedBooking) {
      await prisma.driver.update({
        where: { id },
        data: {
          status: 'INACTIVE',
          dutyStatus: 'OFFLINE',
          isActive: false,
          availabilityStatus: 'OFFLINE',
          notes: 'Archived from admin. Booking history preserved.',
        },
      });
      return NextResponse.json({ success: true, message: 'Driver archived. Booking history preserved.' });
    }

    await prisma.driver.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Driver deleted.' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    return NextResponse.json({ error: getApiErrorMessage(error, 'Failed to delete driver') }, { status: 500 });
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
