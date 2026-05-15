import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import {
  getServiceControlConfig,
  getOperationalZones,
  operationalZoneSelect,
  serializeOperationalZone,
} from '@/lib/operationalZones';

export const dynamic = 'force-dynamic';

const zoneSchema = z.object({
  city: z.string().trim().min(2, 'City name is required'),
  centerLat: z.number().finite('Please select a valid city from suggestions.'),
  centerLng: z.number().finite('Please select a valid city from suggestions.'),
  status: z.enum(['ENABLED', 'LIMITED', 'DISABLED']),
  serviceRadiusKm: z.coerce.number().int().min(5, 'Service radius must be at least 5 km').max(300, 'Service radius cannot exceed 300 km'),
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
const configSchema = z.object({
  allowIndiaWideBooking: z.boolean(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'dispatch:read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const zones = await getOperationalZones(prisma);
    const config = await getServiceControlConfig(prisma);
    return NextResponse.json({ success: true, data: zones, config }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Load service areas error:', error);
    return NextResponse.json({ error: 'Could not load service areas.' }, { status: 500 });
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

    const existingZone = await prisma.serviceArea.findFirst({
      where: { city: { equals: parsed.data.city, mode: 'insensitive' } },
      select: { id: true },
    });

    if (existingZone) {
      return NextResponse.json({ error: 'A service area for this city already exists.' }, { status: 409 });
    }

    const zone = await prisma.serviceArea.create({
      data: parsed.data,
      select: operationalZoneSelect,
    });

    return NextResponse.json({ success: true, message: 'Service area created.', data: serializeOperationalZone(zone) }, { status: 201 });
  } catch (error) {
    console.error('Create service area error:', error);
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
      const existingZone = await prisma.serviceArea.findFirst({
        where: {
          city: { equals: data.city, mode: 'insensitive' },
          id: { not: id },
        },
        select: { id: true },
      });

      if (existingZone) {
        return NextResponse.json({ error: 'A service area for this city already exists.' }, { status: 409 });
      }
    }

    const zone = await prisma.serviceArea.update({
      where: { id },
      data,
      select: operationalZoneSelect,
    });

    return NextResponse.json({ success: true, message: 'Service area updated.', data: serializeOperationalZone(zone) });
  } catch (error) {
    console.error('Update service area error:', error);
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

    const zone = await prisma.serviceArea.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, city: true },
    });

    if (!zone) {
      return NextResponse.json({ error: 'Service area not found.' }, { status: 404 });
    }

    await prisma.serviceArea.delete({
      where: { id: zone.id },
    });

    return NextResponse.json({ success: true, message: 'Service area deleted.', data: { id: zone.id } });
  } catch (error) {
    console.error('Delete service area error:', error);
    return NextResponse.json({ error: getZoneMutationError(error, 'delete') }, { status: getZoneMutationStatus(error) });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'dispatch:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = configSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid service control settings.' }, { status: 400 });
    }

    const config = await prisma.serviceControlConfig.upsert({
      where: { singletonKey: 'default' },
      update: { allowIndiaWideBooking: parsed.data.allowIndiaWideBooking },
      create: {
        singletonKey: 'default',
        allowIndiaWideBooking: parsed.data.allowIndiaWideBooking,
      },
      select: { allowIndiaWideBooking: true },
    });

    return NextResponse.json({ success: true, message: 'Service control updated.', config });
  } catch (error) {
    console.error('Update service control config error:', error);
    return NextResponse.json({ error: 'Could not update service control.' }, { status: 500 });
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
    if (error.code === 'P2002') return 'A service area for this city already exists.';
    if (error.code === 'P2025') return 'Service area not found.';
    if (error.code === 'P2022') return 'The service area database table is missing. Apply the latest migration and try again.';
  }
  return `Could not ${action} service area.`;
}
