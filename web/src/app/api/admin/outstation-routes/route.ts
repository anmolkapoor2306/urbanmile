import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireCurrentAdminAuth } from '@/lib/adminAuth';
import {
  calculateSuggestedFare,
  formatPricingCityTitle,
  getDefaultAliasesForCity,
  normalizePricingCity,
  serializeOutstationRoute,
} from '@/lib/outstationPricing';
import { normalizeIndianStateName, splitCityStateDisplay } from '@/lib/locationFormatting';

const aliasesSchema = z.array(z.string().trim().min(1)).default([]);
const numericInputSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue ? Number(trimmedValue) : undefined;
  }

  return value;
}, z.number().finite());
const nullableNumericInputSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    return trimmedValue ? Number(trimmedValue) : null;
  }

  return value;
}, z.number().finite().positive().nullable());

const createRouteSchema = z.object({
  originCity: z.string().trim().min(2, 'Origin city is required'),
  originState: z.string().trim().nullable().optional(),
  destinationCity: z.string().trim().min(2, 'Destination city is required'),
  destinationState: z.string().trim().nullable().optional(),
  originAliases: aliasesSchema.optional(),
  destinationAliases: aliasesSchema.optional(),
  sedanFare: numericInputSchema.pipe(z.number().positive('Sedan fare must be positive')),
  suvMarkup: numericInputSchema.pipe(z.number().min(0, 'SUV markup cannot be negative')).default(1000),
  estimatedKm: nullableNumericInputSchema.optional(),
  isActive: z.boolean().default(true),
  isBidirectional: z.boolean().default(true),
  notes: z.string().trim().nullable().optional(),
});

const updateRouteSchema = createRouteSchema.partial().extend({
  id: z.string().uuid(),
});

function uniqueAliases(city: string, aliases: string[] | undefined) {
  return Array.from(new Set([...getDefaultAliasesForCity(city), ...(aliases ?? [])].map(normalizePricingCity)));
}

function cleanRouteLocation(cityValue: string, stateValue?: string | null) {
  const parsedLocation = splitCityStateDisplay(cityValue);
  const state = normalizeIndianStateName(stateValue || parsedLocation.state);

  return {
    city: formatPricingCityTitle(parsedLocation.city),
    state: state || null,
  };
}

function getRouteMutationErrorMessage(error: unknown, action: 'create' | 'update') {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return 'A route with this origin and destination already exists. Edit the existing route instead.';
    }

    if (error.code === 'P2022') {
      return 'The route pricing database is missing the latest city/state columns. Apply the latest database migration and try again.';
    }
  }

  return `Could not ${action} outstation route. Check the server logs for details.`;
}

export async function GET(request: NextRequest) {
  const authError = await requireCurrentAdminAuth(request);
  if (authError) return authError;

  const routes = await prisma.outstationRoute.findMany({
    orderBy: [{ isActive: 'desc' }, { originCity: 'asc' }, { destinationCity: 'asc' }],
  });

  return NextResponse.json({ success: true, data: routes.map(serializeOutstationRoute) });
}

export async function POST(request: NextRequest) {
  const authError = await requireCurrentAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const result = createRouteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 }
      );
    }

    const origin = cleanRouteLocation(result.data.originCity, result.data.originState);
    const destination = cleanRouteLocation(result.data.destinationCity, result.data.destinationState);
    const suggestedFare = calculateSuggestedFare(result.data.estimatedKm ?? null);

    const route = await prisma.outstationRoute.create({
      data: {
        originCity: origin.city,
        originState: origin.state,
        destinationCity: destination.city,
        destinationState: destination.state,
        originAliases: uniqueAliases(origin.city, result.data.originAliases),
        destinationAliases: uniqueAliases(destination.city, result.data.destinationAliases),
        sedanFare: result.data.sedanFare,
        suvMarkup: result.data.suvMarkup,
        estimatedKm: result.data.estimatedKm ?? null,
        suggestedFare,
        isActive: result.data.isActive,
        isBidirectional: result.data.isBidirectional,
        notes: result.data.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: serializeOutstationRoute(route) });
  } catch (error) {
    console.error('Create outstation route error:', error);
    return NextResponse.json({ error: getRouteMutationErrorMessage(error, 'create') }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = await requireCurrentAdminAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const result = updateRouteSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 }
      );
    }

    const existingRoute = await prisma.outstationRoute.findUnique({ where: { id: result.data.id } });
    if (!existingRoute) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 });
    }

    const origin = result.data.originCity || result.data.originState !== undefined
      ? cleanRouteLocation(result.data.originCity ?? existingRoute.originCity, result.data.originState ?? existingRoute.originState)
      : {
          city: formatPricingCityTitle(existingRoute.originCity),
          state: existingRoute.originState,
        };
    const destination = result.data.destinationCity || result.data.destinationState !== undefined
      ? cleanRouteLocation(
          result.data.destinationCity ?? existingRoute.destinationCity,
          result.data.destinationState ?? existingRoute.destinationState
        )
      : {
          city: formatPricingCityTitle(existingRoute.destinationCity),
          state: existingRoute.destinationState,
        };
    const estimatedKm = result.data.estimatedKm === undefined
      ? existingRoute.estimatedKm
      : result.data.estimatedKm;
    const estimatedKmNumber = estimatedKm === null ? null : Number(estimatedKm);

    const route = await prisma.outstationRoute.update({
      where: { id: result.data.id },
      data: {
        originCity: origin.city,
        originState: origin.state,
        destinationCity: destination.city,
        destinationState: destination.state,
        originAliases: result.data.originAliases === undefined && result.data.originCity === undefined
          ? existingRoute.originAliases
          : uniqueAliases(origin.city, result.data.originAliases),
        destinationAliases: result.data.destinationAliases === undefined && result.data.destinationCity === undefined
          ? existingRoute.destinationAliases
          : uniqueAliases(destination.city, result.data.destinationAliases),
        sedanFare: result.data.sedanFare ?? existingRoute.sedanFare,
        suvMarkup: result.data.suvMarkup ?? existingRoute.suvMarkup,
        estimatedKm,
        suggestedFare: calculateSuggestedFare(estimatedKmNumber),
        isActive: result.data.isActive ?? existingRoute.isActive,
        isBidirectional: result.data.isBidirectional ?? existingRoute.isBidirectional,
        notes: result.data.notes === undefined ? existingRoute.notes : result.data.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: serializeOutstationRoute(route) });
  } catch (error) {
    console.error('Update outstation route error:', error);
    return NextResponse.json({ error: getRouteMutationErrorMessage(error, 'update') }, { status: 500 });
  }
}
