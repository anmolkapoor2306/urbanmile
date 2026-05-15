import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  quoteOutstationRouteFromRoutes,
} from '@/lib/outstationPricing';
import { isRouteServiceable } from '@/lib/operationalZones';
import { getPricingConfig } from '@/lib/pricingConfig';
import { PricingEngineError, calculateFare, normalizePricingRouteType, normalizePricingVehicleType } from '@/lib/pricingEngine';
import { readTripOverrides } from '@/lib/tripOverrideStore';
import {
  createTripOverrideDebugInfo,
  getTripOverridePrice,
  getTripOverrideVehiclePrice,
  logTripOverrideDebug,
  matchTripOverride,
} from '@/lib/tripOverrides';

const quoteSchema = z.object({
  pickupLocation: z.string().trim().min(1),
  pickupLatitude: z.number().finite().nullable().optional(),
  pickupLongitude: z.number().finite().nullable().optional(),
  dropoffLocation: z.string().trim().min(1),
  dropoffLatitude: z.number().finite().nullable().optional(),
  dropoffLongitude: z.number().finite().nullable().optional(),
  distanceKm: z.number().finite().positive().nullable().optional(),
  durationMinutes: z.number().finite().positive().nullable().optional(),
  vehicleType: z.string().trim().optional(),
  routeType: z.string().trim().optional(),
  tollCost: z.number().finite().min(0).nullable().optional(),
  roundTripTollCost: z.number().finite().min(0).nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = quoteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid route details' }, { status: 400 });
    }

    const vehicleType = normalizePricingVehicleType(result.data.vehicleType ?? 'SEDAN');
    const routeType = normalizePricingRouteType(result.data.routeType ?? 'ONE_WAY');
    const serviceability = await isRouteServiceable(prisma, {
      pickupLocation: result.data.pickupLocation,
      pickupLatitude: result.data.pickupLatitude,
      pickupLongitude: result.data.pickupLongitude,
      dropoffLocation: result.data.dropoffLocation,
      dropoffLatitude: result.data.dropoffLatitude,
      dropoffLongitude: result.data.dropoffLongitude,
      carType: vehicleType,
      bookingMode: routeType,
    });

    if (!serviceability.ok) {
      return NextResponse.json(
        {
          success: false,
          error: serviceability.message,
          code: serviceability.code,
          serviceability: serializeServiceability(serviceability),
        },
        { status: 400 }
      );
    }

    const tripOverrides = await readTripOverrides();
    const overrideMatch = matchTripOverride(
      tripOverrides,
      result.data.pickupLocation,
      result.data.dropoffLocation
    );
    const overrideFare = overrideMatch
      ? getTripOverrideVehiclePrice(overrideMatch.override, vehicleType)
      : null;
    const overrideDebugInfo = createTripOverrideDebugInfo({
      overrides: tripOverrides,
      pickupAddress: result.data.pickupLocation,
      dropoffAddress: result.data.dropoffLocation,
      match: overrideMatch,
      finalFareSource: overrideFare !== null ? 'override' : 'calculated',
    });
    logTripOverrideDebug('server pricing quote', overrideDebugInfo);

    if (overrideMatch && overrideFare !== null) {
      const sedanPrice = getTripOverridePrice(overrideMatch.override.sedanPrice);
      const suvPrice = getTripOverridePrice(overrideMatch.override.suvPrice);
      const premiumPrice = getTripOverridePrice(overrideMatch.override.premiumPrice);

      return NextResponse.json({
        success: true,
        data: {
          pickupCity: overrideMatch.pickupCity,
          dropoffCity: overrideMatch.dropoffCity,
          routeId: null,
          sedanPrice,
          ecoPrice: sedanPrice,
          xlPrice: suvPrice > 0 ? suvPrice : null,
          premiumPrice: premiumPrice > 0 ? premiumPrice : null,
          suvMarkup: suvPrice > 0 ? Math.max(0, suvPrice - sedanPrice) : null,
          requestedPrice: overrideFare,
          pricingBreakdown: null,
          pricingDistanceKm: result.data.distanceKm ?? null,
          oneWayDistanceKm: result.data.distanceKm ?? null,
          durationMinutes: result.data.durationMinutes ?? null,
          matchedDirection: overrideMatch.matchedDirection,
          customPricingRequired: false,
          priceSource: 'override',
          pricingSource: 'TRIP_OVERRIDE',
          tripOverrideId: overrideMatch.override.id,
          overrideDebug: overrideDebugInfo,
          serviceability: serializeServiceability(serviceability),
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
    const matchedRoute = quote.routeId ? routes.find((route) => route.id === quote.routeId) : null;
    const distanceKm =
      result.data.distanceKm ??
      (matchedRoute?.estimatedKm === null || matchedRoute?.estimatedKm === undefined
        ? null
        : Number(matchedRoute.estimatedKm));

    if (!distanceKm || !Number.isFinite(distanceKm) || distanceKm <= 0) {
      return NextResponse.json({
        success: true,
        data: {
          ...quote,
          sedanPrice: null,
          ecoPrice: null,
          xlPrice: null,
          premiumPrice: null,
          customPricingRequired: true,
          priceSource: 'calculated',
          pricingSource: 'PRICING_ENGINE',
          tripOverrideId: null,
          overrideDebug: overrideDebugInfo,
          serviceability: serializeServiceability(serviceability),
        },
      });
    }

    const config = await getPricingConfig();
    const requestedFare = calculateFare({
      vehicleType,
      routeType,
      distanceKm,
      tollCost: result.data.tollCost,
      roundTripTollCost: result.data.roundTripTollCost,
      config,
    });
    const sedanFare = calculateFare({
      vehicleType: 'SEDAN',
      routeType,
      distanceKm,
      tollCost: result.data.tollCost,
      roundTripTollCost: result.data.roundTripTollCost,
      config,
    });
    const suvFare = calculateFare({
      vehicleType: 'SUV',
      routeType,
      distanceKm,
      tollCost: result.data.tollCost,
      roundTripTollCost: result.data.roundTripTollCost,
      config,
    });
    const premiumFare = calculateFare({
      vehicleType: 'PREMIUM',
      routeType,
      distanceKm,
      tollCost: result.data.tollCost,
      roundTripTollCost: result.data.roundTripTollCost,
      config,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...quote,
        pickupCity: quote.pickupCity ?? result.data.pickupLocation,
        dropoffCity: quote.dropoffCity ?? result.data.dropoffLocation,
        sedanPrice: sedanFare.finalFare,
        ecoPrice: sedanFare.finalFare,
        xlPrice: suvFare.finalFare,
        premiumPrice: premiumFare.finalFare,
        suvMarkup: Math.max(0, suvFare.finalFare - sedanFare.finalFare),
        requestedPrice: requestedFare.finalFare,
        pricingBreakdown: requestedFare,
        pricingDistanceKm: requestedFare.pricingDistanceKm,
        oneWayDistanceKm: requestedFare.oneWayDistanceKm,
        durationMinutes: result.data.durationMinutes ?? null,
        customPricingRequired: false,
        priceSource: 'calculated',
        pricingSource: 'PRICING_ENGINE',
        tripOverrideId: null,
        overrideDebug: overrideDebugInfo,
        serviceability: serializeServiceability(serviceability),
      },
    });
  } catch (error) {
    if (error instanceof PricingEngineError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Outstation pricing quote error:', error);
    return NextResponse.json({ error: 'Unable to check route pricing' }, { status: 500 });
  }
}

function serializeServiceability(serviceability: Awaited<ReturnType<typeof isRouteServiceable>>) {
  return {
    status: serviceability.confirmation === 'manual' ? 'manual_confirmation' : serviceability.confirmation === 'instant' ? 'available' : 'unavailable',
    message: serviceability.message,
    code: serviceability.code,
    zoneCity: serviceability.pickupZone?.city ?? null,
    pickupZoneCity: serviceability.pickupZone?.city ?? null,
    dropoffZoneCity: serviceability.dropoffZone?.city ?? null,
  };
}
