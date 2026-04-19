import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { DRIVER_TYPES } from '@/lib/dispatch';
import { driverRecordSelect, serializeDriver } from '@/lib/driverRecord';
import { generateDriverCode, backfillDriverCodes } from '@/lib/driverCode';

const driverSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Driver name is required'),
  phone: z.string().trim().min(7, 'Phone number is required'),
  email: z.string().trim().email('Please enter a valid email').optional().or(z.literal('')),
  vehicleType: z.enum(['SEDAN', 'SUV', 'VAN', 'LUXURY']),
  vehicleNumber: z.string().trim().min(2, 'Vehicle number is required'),
  isActive: z.boolean().optional().default(true),
  driverType: z.enum(DRIVER_TYPES),
  availabilityStatus: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).optional().default('AVAILABLE'),
  companyName: z.string().trim().optional(),
  licenseInfo: z.string().trim().optional(),
  vendorId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().trim().optional(),
});

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
    const result = driverSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 }
      );
    }

    const driverCode = await generateDriverCode(prisma, result.data.driverType);

    const driver = await prisma.driver.create({
      data: {
        driverCode,
        name: result.data.name,
        phone: result.data.phone,
        email: result.data.email || null,
        vehicleType: result.data.vehicleType,
        vehicleNumber: result.data.vehicleNumber,
        isActive: result.data.isActive,
        driverType: result.data.driverType,
        availabilityStatus: result.data.availabilityStatus,
        companyName: result.data.companyName || null,
        licenseInfo: result.data.licenseInfo || null,
        vendorId: result.data.vendorId || null,
        notes: result.data.notes || null,
      },
      select: driverRecordSelect,
    });

    return NextResponse.json({ success: true, data: serializeDriver(driver) }, { status: 201 });
  } catch (error) {
    console.error('Error creating driver:', error);
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const result = driverSchema.partial().safeParse(body);

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
      return NextResponse.json({ success: true, data: serializeDriver(existingDriver) });
    }

    const updateData: Record<string, unknown> = {};

    if (result.data.name !== undefined) updateData.name = result.data.name;
    if (result.data.phone !== undefined) updateData.phone = result.data.phone;
    if (result.data.email !== undefined) updateData.email = result.data.email || null;
    if (result.data.vehicleType !== undefined) updateData.vehicleType = result.data.vehicleType;
    if (result.data.vehicleNumber !== undefined) updateData.vehicleNumber = result.data.vehicleNumber;
    if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;
    if (result.data.driverType !== undefined) updateData.driverType = result.data.driverType;
    if (result.data.availabilityStatus !== undefined) updateData.availabilityStatus = result.data.availabilityStatus;
    if (result.data.companyName !== undefined) updateData.companyName = result.data.companyName || null;
    if (result.data.licenseInfo !== undefined) updateData.licenseInfo = result.data.licenseInfo || null;
    if (result.data.vendorId !== undefined) updateData.vendorId = result.data.vendorId || null;
    if (result.data.notes !== undefined) updateData.notes = result.data.notes || null;

    if (updateData.driverType) {
      updateData.driverCode = await generateDriverCode(prisma, updateData.driverType as 'OWN' | 'THIRD_PARTY');
    }

    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: updateData,
      select: driverRecordSelect,
    });

    return NextResponse.json({ success: true, data: serializeDriver(updated) });
  } catch (error) {
    console.error('Error updating driver:', error);
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
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
