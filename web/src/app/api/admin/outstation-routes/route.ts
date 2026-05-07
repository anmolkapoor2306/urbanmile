import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import {
  calculateSuggestedFare,
  getDefaultAliasesForCity,
  normalizePricingCity,
  serializeOutstationRoute,
} from '@/lib/outstationPricing';

const aliasesSchema = z.array(z.string().trim().min(1)).default([]);

const createRouteSchema = z.object({
  originCity: z.string().trim().min(2, 'Origin city is required'),
  destinationCity: z.string().trim().min(2, 'Destination city is required'),
  originAliases: aliasesSchema.optional(),
  destinationAliases: aliasesSchema.optional(),
  sedanFare: z.number().finite().positive('Sedan fare must be positive'),
  suvMarkup: z.number().finite().min(0, 'SUV markup cannot be negative').default(1000),
  estimatedKm: z.number().finite().positive().nullable().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().trim().nullable().optional(),
});

const updateRouteSchema = createRouteSchema.partial().extend({
  id: z.string().uuid(),
});

function uniqueAliases(city: string, aliases: string[] | undefined) {
  return Array.from(new Set([...getDefaultAliasesForCity(city), ...(aliases ?? [])].map(normalizePricingCity)));
}

export async function GET(request: NextRequest) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  const routes = await prisma.outstationRoute.findMany({
    orderBy: [{ isActive: 'desc' }, { originCity: 'asc' }, { destinationCity: 'asc' }],
  });

  return NextResponse.json({ success: true, data: routes.map(serializeOutstationRoute) });
}

export async function POST(request: NextRequest) {
  const authError = requireAdminAuth(request);
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

    const originCity = normalizePricingCity(result.data.originCity);
    const destinationCity = normalizePricingCity(result.data.destinationCity);
    const suggestedFare = calculateSuggestedFare(result.data.estimatedKm ?? null);

    const route = await prisma.outstationRoute.create({
      data: {
        originCity,
        destinationCity,
        originAliases: uniqueAliases(originCity, result.data.originAliases),
        destinationAliases: uniqueAliases(destinationCity, result.data.destinationAliases),
        sedanFare: result.data.sedanFare,
        suvMarkup: result.data.suvMarkup,
        estimatedKm: result.data.estimatedKm ?? null,
        suggestedFare,
        isActive: result.data.isActive,
        notes: result.data.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: serializeOutstationRoute(route) });
  } catch (error) {
    console.error('Create outstation route error:', error);
    return NextResponse.json({ error: 'Could not create outstation route' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authError = requireAdminAuth(request);
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

    const originCity = result.data.originCity ? normalizePricingCity(result.data.originCity) : existingRoute.originCity;
    const destinationCity = result.data.destinationCity
      ? normalizePricingCity(result.data.destinationCity)
      : existingRoute.destinationCity;
    const estimatedKm = result.data.estimatedKm === undefined
      ? existingRoute.estimatedKm
      : result.data.estimatedKm;
    const estimatedKmNumber = estimatedKm === null ? null : Number(estimatedKm);

    const route = await prisma.outstationRoute.update({
      where: { id: result.data.id },
      data: {
        originCity,
        destinationCity,
        originAliases: result.data.originAliases === undefined
          ? existingRoute.originAliases
          : uniqueAliases(originCity, result.data.originAliases),
        destinationAliases: result.data.destinationAliases === undefined
          ? existingRoute.destinationAliases
          : uniqueAliases(destinationCity, result.data.destinationAliases),
        sedanFare: result.data.sedanFare ?? existingRoute.sedanFare,
        suvMarkup: result.data.suvMarkup ?? existingRoute.suvMarkup,
        estimatedKm,
        suggestedFare: calculateSuggestedFare(estimatedKmNumber),
        isActive: result.data.isActive ?? existingRoute.isActive,
        notes: result.data.notes === undefined ? existingRoute.notes : result.data.notes || null,
      },
    });

    return NextResponse.json({ success: true, data: serializeOutstationRoute(route) });
  } catch (error) {
    console.error('Update outstation route error:', error);
    return NextResponse.json({ error: 'Could not update outstation route' }, { status: 500 });
  }
}
