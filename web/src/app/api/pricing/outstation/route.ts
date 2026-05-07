import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  quoteOutstationRouteFromRoutes,
} from '@/lib/outstationPricing';

const quoteSchema = z.object({
  pickupLocation: z.string().trim().min(1),
  dropoffLocation: z.string().trim().min(1),
  distanceKm: z.number().finite().positive().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = quoteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid route details' }, { status: 400 });
    }

    const routes = await prisma.outstationRoute.findMany({
      where: { isActive: true },
      orderBy: [{ originCity: 'asc' }, { destinationCity: 'asc' }],
    });

    const quote = quoteOutstationRouteFromRoutes({
      routes,
      pickupLocation: result.data.pickupLocation,
      dropoffLocation: result.data.dropoffLocation,
      distanceKm: result.data.distanceKm,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...quote,
      },
    });
  } catch (error) {
    console.error('Outstation pricing quote error:', error);
    return NextResponse.json({ error: 'Unable to check route pricing' }, { status: 500 });
  }
}
