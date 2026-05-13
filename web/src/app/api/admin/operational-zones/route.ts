import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import type { BookingStatus } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import {
  getOperationalZones,
  operationalZoneSelect,
  serializeOperationalZone,
} from '@/lib/operationalZones';

export const dynamic = 'force-dynamic';

const zoneSchema = z.object({
  city: z.string().trim().min(2, 'City name is required'),
  status: z.enum(['ENABLED', 'LIMITED', 'DISABLED']),
  serviceRadiusKm: z.coerce.number().int().min(1, 'Service radius must be at least 1 km').max(500, 'Service radius cannot exceed 500 km'),
  airportEnabled: z.boolean(),
  outstationEnabled: z.boolean(),
  autoDispatchEnabled: z.boolean(),
  enabledVehicleTypes: z.array(z.enum(['SEDAN', 'SUV', 'PREMIUM'])).min(1, 'Select at least one vehicle type'),
});

const updateZoneSchema = zoneSchema.partial().extend({
  id: z.string().uuid(),
});

const deleteZoneSchema = z.object({
  id: z.string().uuid(),
});

const activeOrFutureBookingStatuses: BookingStatus[] = ['NEEDS_ASSIGNMENT', 'ASSIGNED', 'ACTIVE'];
const zoneHasBookingsMessage = 'This zone has active or future bookings. Disable the zone instead.';

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'dispatch:read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const zones = await getOperationalZones(prisma);
    return NextResponse.json({ success: true, data: zones }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Load operational zones error:', error);
    return NextResponse.json({ error: 'Could not load operational zones.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'dispatch:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = zoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
    }

    const existingZone = await prisma.operationalZone.findFirst({
      where: { city: { equals: parsed.data.city, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existingZone) {
      return NextResponse.json({ error: 'An operational zone for this city already exists.' }, { status: 409 });
    }

    const zone = await prisma.operationalZone.create({
      data: parsed.data,
      select: operationalZoneSelect,
    });

    return NextResponse.json({ success: true, message: 'Operational zone created.', data: serializeOperationalZone(zone) }, { status: 201 });
  } catch (error) {
    console.error('Create operational zone error:', error);
    return NextResponse.json({ error: getZoneMutationError(error, 'create') }, { status: getZoneMutationStatus(error) });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'dispatch:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = updateZoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
    }

    const { id, ...data } = parsed.data;
    if (data.city) {
      const existingZone = await prisma.operationalZone.findFirst({
        where: {
          city: { equals: data.city, mode: 'insensitive' },
          id: { not: id },
        },
        select: { id: true },
      });

      if (existingZone) {
        return NextResponse.json({ error: 'An operational zone for this city already exists.' }, { status: 409 });
      }
    }

    const zone = await prisma.operationalZone.update({
      where: { id },
      data,
      select: operationalZoneSelect,
    });

    return NextResponse.json({ success: true, message: 'Operational zone updated.', data: serializeOperationalZone(zone) });
  } catch (error) {
    console.error('Update operational zone error:', error);
    return NextResponse.json({ error: getZoneMutationError(error, 'update') }, { status: getZoneMutationStatus(error) });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'dispatch:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = deleteZoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((issue) => issue.message).join(', ') }, { status: 400 });
    }

    const zone = await prisma.operationalZone.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, city: true },
    });

    if (!zone) {
      return NextResponse.json({ error: 'Operational zone not found.' }, { status: 404 });
    }

    const blockingBooking = await prisma.booking.findFirst({
      where: {
        pickupLocation: { contains: zone.city, mode: 'insensitive' },
        OR: [
          { status: { in: activeOrFutureBookingStatuses } },
          {
            pickupDateTime: { gte: new Date() },
            status: { notIn: ['COMPLETE', 'CANCELLED'] },
          },
        ],
      },
      select: { id: true },
    });

    if (blockingBooking) {
      return NextResponse.json({ error: zoneHasBookingsMessage }, { status: 409 });
    }

    await prisma.operationalZone.delete({
      where: { id: zone.id },
    });

    return NextResponse.json({ success: true, message: 'Operational zone deleted.', data: { id: zone.id } });
  } catch (error) {
    console.error('Delete operational zone error:', error);
    return NextResponse.json({ error: getZoneMutationError(error, 'delete') }, { status: getZoneMutationStatus(error) });
  }
}

function getZoneMutationStatus(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2025')) {
    return error.code === 'P2025' ? 404 : 409;
  }
  return 500;
}

function getZoneMutationError(error: unknown, action: 'create' | 'update' | 'delete') {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return 'An operational zone for this city already exists.';
    if (error.code === 'P2025') return 'Operational zone not found.';
    if (error.code === 'P2022') return 'The operational zone database table is missing. Apply the latest migration and try again.';
  }
  return `Could not ${action} operational zone.`;
}
