import prisma from '@/lib/prisma';
import {
  getTripOverridePrice,
  sanitizeTripOverride,
  sanitizeTripOverrides,
  type TripOverride,
} from '@/lib/tripOverrides';

type TripOverrideRecord = {
  id: string;
  fromCity: string;
  toCity: string;
  sedanPrice: unknown;
  suvPrice: unknown;
  premiumPrice: unknown;
  reverseRouteEnabled: boolean;
  active: boolean;
};

export async function readTripOverrides(): Promise<TripOverride[]> {
  try {
    const records = await prisma.tripOverride.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const overrides = records
      .map((record) => tripOverrideFromDb(record))
      .filter((override): override is TripOverride => Boolean(override));

    console.info('[Trip Override API] read success', {
      count: overrides.length,
    });

    return overrides;
  } catch (error) {
    console.error('[Trip Override API] read database error', serializeErrorForLogs(error));
    throw error;
  }
}

export async function writeTripOverrides(value: unknown): Promise<TripOverride[]> {
  const overrides = sanitizeTripOverrides(value);

  console.info('[Trip Override API] write payload sanitized', {
    requestedCount: Array.isArray(value) ? value.length : null,
    sanitizedCount: overrides.length,
    overrides: overrides.map(toLogPayload),
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.tripOverride.deleteMany();

      if (overrides.length === 0) {
        return;
      }

      await tx.tripOverride.createMany({
        data: overrides.map((override) => ({
          id: override.id,
          fromCity: override.fromCity,
          toCity: override.toCity,
          sedanPrice: getTripOverridePrice(override.sedanPrice),
          suvPrice: nullablePrice(override.suvPrice),
          premiumPrice: nullablePrice(override.premiumPrice),
          reverseRouteEnabled: override.reverseRouteEnabled,
          active: override.isActive,
        })),
      });
    });

    const savedOverrides = await readTripOverrides();
    console.info('[Trip Override API] write success', {
      savedCount: savedOverrides.length,
    });

    return savedOverrides;
  } catch (error) {
    console.error('[Trip Override API] write database error', serializeErrorForLogs(error));
    throw error;
  }
}

function tripOverrideFromDb(record: TripOverrideRecord) {
  return sanitizeTripOverride({
    id: record.id,
    fromCity: record.fromCity,
    toCity: record.toCity,
    sedanPrice: decimalToString(record.sedanPrice),
    suvPrice: decimalToString(record.suvPrice),
    premiumPrice: decimalToString(record.premiumPrice),
    reverseRouteEnabled: record.reverseRouteEnabled,
    isActive: record.active,
  });
}

function decimalToString(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return typeof value === 'object' && 'toString' in value ? value.toString() : String(value);
}

function toLogPayload(override: TripOverride) {
  return {
    id: override.id,
    fromCity: override.fromCity,
    toCity: override.toCity,
    sedanPrice: override.sedanPrice,
    suvPrice: override.suvPrice,
    premiumPrice: override.premiumPrice,
    reverseRouteEnabled: override.reverseRouteEnabled,
    active: override.isActive,
  };
}

function nullablePrice(value: unknown) {
  const price = getTripOverridePrice(value);
  return price > 0 ? price : null;
}

function serializeErrorForLogs(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}
