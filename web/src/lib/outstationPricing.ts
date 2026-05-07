import { Prisma } from '@prisma/client';

export const OUTSTATION_SUGGESTED_RATE_PER_KM = 16;
export const DEFAULT_OUTSTATION_SUV_MARKUP = 1000;

export type TripType = 'local' | 'outstation';
export type OutstationVehicle = 'MILES_ECO' | 'MILES_XL' | 'SEDAN' | 'VAN';

export type TripClassification = {
  tripType: TripType;
  pickupCity: string | null;
  dropoffCity: string | null;
};

export type OutstationRouteLike = {
  id?: string;
  originCity: string;
  destinationCity: string;
  originAliases: string[];
  destinationAliases: string[];
  sedanFare: number | Prisma.Decimal;
  suvMarkup: number | Prisma.Decimal;
  estimatedKm?: number | Prisma.Decimal | null;
  suggestedFare?: number | Prisma.Decimal | null;
  isActive: boolean;
  isBidirectional: boolean;
  notes?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type OutstationRoutePricingResult = TripClassification & {
  routeId: string | null;
  sedanPrice: number | null;
  ecoPrice: number | null;
  xlPrice: number | null;
  suvMarkup: number | null;
  matchedDirection: 'forward' | 'inverse' | null;
  customPricingRequired: boolean;
};

export const OUTSTATION_CITY_SUGGESTIONS = [
  'Jalandhar',
  'Amritsar',
  'Chandigarh',
  'Zirakpur',
  'Panchkula',
  'Nawanshahr',
  'Ludhiana',
  'Patiala',
  'Rajpura',
  'Roopnagar',
  'Pathankot',
  'Jammu',
  'Tarn Taran',
  'Moga',
  'Hoshiarpur',
  'Adampur Airport',
  'Batala',
  'Firozpur',
  'Delhi Airport',
  'Ambala',
  'Delhi City',
] as const;

export const OUTSTATION_CITY_ALIASES: Record<string, string> = {
  jal: 'jalandhar',
  jalandhar: 'jalandhar',
  'jalandhar punjab': 'jalandhar',
  chd: 'chandigarh',
  chandigarh: 'chandigarh',
  delhi: 'delhi city',
  'delhi city': 'delhi city',
  'new delhi': 'delhi city',
  'delhi airport': 'delhi airport',
  'igi airport': 'delhi airport',
  'indira gandhi airport': 'delhi airport',
  'indira gandhi international airport': 'delhi airport',
  'indira gandhi intl airport': 'delhi airport',
  frojpur: 'firozpur',
  firozpur: 'firozpur',
  ferozepur: 'firozpur',
  tarantaran: 'tarn taran',
  'tarn taran': 'tarn taran',
  ropar: 'roopnagar',
  roopnagar: 'roopnagar',
  adampur: 'adampur airport',
  'adampur airport': 'adampur airport',
};

export const JALANDHAR_OUTSTATION_SEDAN_ROUTES: Array<[string, string, number]> = [
  ['jalandhar', 'amritsar', 2000],
  ['jalandhar', 'chandigarh', 2500],
  ['jalandhar', 'zirakpur', 2700],
  ['jalandhar', 'panchkula', 2800],
  ['jalandhar', 'nawanshahr', 2200],
  ['jalandhar', 'ludhiana', 1800],
  ['jalandhar', 'patiala', 2800],
  ['jalandhar', 'rajpura', 2500],
  ['jalandhar', 'roopnagar', 2300],
  ['jalandhar', 'pathankot', 2200],
  ['jalandhar', 'jammu', 3200],
  ['jalandhar', 'tarn taran', 2000],
  ['jalandhar', 'moga', 2000],
  ['jalandhar', 'hoshiarpur', 1500],
  ['jalandhar', 'adampur airport', 1200],
  ['jalandhar', 'batala', 1800],
  ['jalandhar', 'firozpur', 1850],
  ['jalandhar', 'delhi airport', 6000],
  ['jalandhar', 'ambala', 3000],
  ['jalandhar', 'delhi city', 6300],
];

export const JALANDHAR_OUTSTATION_SEED_ROUTES = JALANDHAR_OUTSTATION_SEDAN_ROUTES.map(
  ([originCity, destinationCity, sedanFare]) => ({
    originCity,
    destinationCity,
    originAliases: getDefaultAliasesForCity(originCity),
    destinationAliases: getDefaultAliasesForCity(destinationCity),
    sedanFare,
    suvMarkup: DEFAULT_OUTSTATION_SUV_MARKUP,
    estimatedKm: null,
    suggestedFare: null,
    isActive: true,
    isBidirectional: true,
    notes: 'Seeded Jalandhar one-way outstation fare',
  })
);

const SORTED_CITY_ALIASES = Object.entries(OUTSTATION_CITY_ALIASES).sort(
  ([leftAlias], [rightAlias]) => rightAlias.length - leftAlias.length
);

const KNOWN_CANONICAL_CITIES = Array.from(
  new Set([
    ...OUTSTATION_CITY_SUGGESTIONS.map((city) => normalizePricingCity(city)),
    ...Object.values(OUTSTATION_CITY_ALIASES),
    ...JALANDHAR_OUTSTATION_SEDAN_ROUTES.flatMap(([origin, destination]) => [origin, destination]),
  ])
).sort((a, b) => b.length - a.length);

export function normalizePricingCity(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(india|punjab)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return OUTSTATION_CITY_ALIASES[normalized] ?? normalized;
}

function containsLocationToken(input: string, token: string) {
  return (
    input === token ||
    input.startsWith(`${token} `) ||
    input.endsWith(` ${token}`) ||
    input.includes(` ${token} `)
  );
}

export function detectCityFromAddress(value: string): string | null {
  const normalizedAddress = normalizePricingCity(value);

  if (!normalizedAddress) {
    return null;
  }

  for (const [alias, city] of SORTED_CITY_ALIASES) {
    const normalizedAlias = normalizePricingCity(alias);
    if (containsLocationToken(normalizedAddress, normalizedAlias)) {
      return city;
    }
  }

  return KNOWN_CANONICAL_CITIES.find((city) => containsLocationToken(normalizedAddress, city)) ?? null;
}

export function classifyTripType({
  pickupLocation,
  dropoffLocation,
  distanceKm,
}: {
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm?: number | null;
}): TripClassification {
  const pickupCity = detectCityFromAddress(pickupLocation);
  const dropoffCity = detectCityFromAddress(dropoffLocation);
  const hasOutstationDistance = typeof distanceKm === 'number' && distanceKm > 60;
  const hasDifferentDetectedCities = Boolean(pickupCity && dropoffCity && pickupCity !== dropoffCity);

  return {
    tripType: hasDifferentDetectedCities || hasOutstationDistance ? 'outstation' : 'local',
    pickupCity,
    dropoffCity,
  };
}

export function getDefaultAliasesForCity(city: string): string[] {
  const normalizedCity = normalizePricingCity(city);
  const aliases = Object.entries(OUTSTATION_CITY_ALIASES)
    .filter(([, targetCity]) => targetCity === normalizedCity)
    .map(([alias]) => alias);

  return Array.from(new Set([normalizedCity, ...aliases]));
}

function routeCityCandidates(city: string, aliases: string[]) {
  return Array.from(new Set([normalizePricingCity(city), ...aliases.map(normalizePricingCity)]));
}

function routeMatchesCity(city: string | null, routeCity: string, routeAliases: string[]) {
  if (!city) {
    return false;
  }

  return routeCityCandidates(routeCity, routeAliases).includes(city);
}

function toNumber(value: number | Prisma.Decimal | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === 'number' ? value : Number(value);
}

export function getOutstationVehicleFare(sedanPrice: number, vehicle: OutstationVehicle, suvMarkup = DEFAULT_OUTSTATION_SUV_MARKUP) {
  return vehicle === 'MILES_XL' || vehicle === 'VAN' ? sedanPrice + suvMarkup : sedanPrice;
}

export function calculateSuggestedFare(estimatedKm: number | null | undefined) {
  if (typeof estimatedKm !== 'number' || !Number.isFinite(estimatedKm) || estimatedKm <= 0) {
    return null;
  }

  return Math.round(estimatedKm * OUTSTATION_SUGGESTED_RATE_PER_KM);
}

export function quoteOutstationRouteFromRoutes({
  routes,
  pickupLocation,
  dropoffLocation,
  distanceKm,
}: {
  routes: OutstationRouteLike[];
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm?: number | null;
}): OutstationRoutePricingResult {
  const classification = classifyTripType({ pickupLocation, dropoffLocation, distanceKm });

  if (classification.tripType !== 'outstation') {
    return {
      ...classification,
      routeId: null,
      sedanPrice: null,
      ecoPrice: null,
      xlPrice: null,
      suvMarkup: null,
      customPricingRequired: false,
    };
  }

  const activeRoute = routes.find((route) => {
    if (!route.isActive) {
      return false;
    }

    return (
      routeMatchesCity(classification.pickupCity, route.originCity, route.originAliases) &&
      routeMatchesCity(classification.dropoffCity, route.destinationCity, route.destinationAliases)
    );
  });

  if (!activeRoute) {
    return {
      ...classification,
      routeId: null,
      sedanPrice: null,
      ecoPrice: null,
      xlPrice: null,
      suvMarkup: null,
      customPricingRequired: true,
    };
  }

  const sedanPrice = toNumber(activeRoute.sedanFare) ?? 0;
  const suvMarkup = toNumber(activeRoute.suvMarkup) ?? DEFAULT_OUTSTATION_SUV_MARKUP;

  return {
    ...classification,
    routeId: activeRoute.id ?? null,
    sedanPrice,
    ecoPrice: getOutstationVehicleFare(sedanPrice, 'MILES_ECO', suvMarkup),
    xlPrice: getOutstationVehicleFare(sedanPrice, 'MILES_XL', suvMarkup),
    suvMarkup,
    customPricingRequired: false,
  };
}

export function serializeOutstationRoute(route: OutstationRouteLike) {
  const estimatedKm = toNumber(route.estimatedKm);

  return {
    id: route.id ?? '',
    originCity: route.originCity,
    destinationCity: route.destinationCity,
    originAliases: route.originAliases,
    destinationAliases: route.destinationAliases,
    sedanFare: toNumber(route.sedanFare) ?? 0,
    suvMarkup: toNumber(route.suvMarkup) ?? DEFAULT_OUTSTATION_SUV_MARKUP,
    estimatedKm,
    suggestedFare: toNumber(route.suggestedFare) ?? calculateSuggestedFare(estimatedKm),
    isActive: route.isActive,
    notes: route.notes ?? '',
    createdAt: route.createdAt instanceof Date ? route.createdAt.toISOString() : route.createdAt ?? '',
    updatedAt: route.updatedAt instanceof Date ? route.updatedAt.toISOString() : route.updatedAt ?? '',
  };
}
