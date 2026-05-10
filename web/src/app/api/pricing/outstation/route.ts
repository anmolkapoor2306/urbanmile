import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  quoteOutstationRouteFromRoutes,
} from '@/lib/outstationPricing';
import { readTripOverrides } from '@/lib/tripOverrideStore';
import {
  calculateTripOverrideMilesXlPrice,
  createTripOverrideDebugInfo,
  getTripOverrideMilesXlMarkupAmount,
  getTripOverrideSedanPrice,
  logTripOverrideDebug,
  matchTripOverride,
} from '@/lib/tripOverrides';

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

    const tripOverrides = await readTripOverrides();
    const overrideMatch = matchTripOverride(
      tripOverrides,
      result.data.pickupLocation,
      result.data.dropoffLocation
    );
    const overrideDebugInfo = createTripOverrideDebugInfo({
      overrides: tripOverrides,
      pickupAddress: result.data.pickupLocation,
      dropoffAddress: result.data.dropoffLocation,
      match: overrideMatch,
      finalFareSource: overrideMatch ? 'override' : 'calculated',
    });
    logTripOverrideDebug('server pricing quote', overrideDebugInfo);

    if (overrideMatch) {
      const sedanPrice = getTripOverrideSedanPrice(overrideMatch.override);
      const xlPrice = calculateTripOverrideMilesXlPrice(overrideMatch.override);

      return NextResponse.json({
        success: true,
        data: {
          pickupCity: overrideMatch.pickupCity,
          dropoffCity: overrideMatch.dropoffCity,
          routeId: null,
          sedanPrice,
          ecoPrice: sedanPrice,
          xlPrice,
          suvMarkup: getTripOverrideMilesXlMarkupAmount(overrideMatch.override),
          matchedDirection: overrideMatch.matchedDirection,
          customPricingRequired: false,
          priceSource: 'override',
          tripOverrideId: overrideMatch.override.id,
          overrideDebug: overrideDebugInfo,
        },
      });
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
        priceSource: quote.routeId ? 'route' : 'calculated',
        tripOverrideId: null,
        overrideDebug: overrideDebugInfo,
      },
    });
  } catch (error) {
    console.error('Outstation pricing quote error:', error);
    return NextResponse.json({ error: 'Unable to check route pricing' }, { status: 500 });
  }
}
