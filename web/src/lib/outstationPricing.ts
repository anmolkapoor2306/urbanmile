import { Prisma } from '@prisma/client';
import { normalizeIndianStateName, splitCityStateDisplay } from '@/lib/locationFormatting';

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
  originState?: string | null;
  destinationCity: string;
  destinationState?: string | null;
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
  const cityValue = value.includes(',') ? splitCityStateDisplay(value).city : value;
  const normalized = cityValue
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(india|punjab|haryana|rajasthan|uttar pradesh|chandigarh)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return OUTSTATION_CITY_ALIASES[normalized] ?? normalized;
}

export function formatPricingCityTitle(value: string): string {
  const normalizedCity = normalizePricingCity(value);
  const knownCity = OUTSTATION_CITY_SUGGESTIONS.find((city) => normalizePricingCity(city) === normalizedCity);

  if (knownCity) {
    return knownCity;
  }

  return normalizedCity
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function detectCityFromRouteList(value: string, routes: OutstationRouteLike[]) {
  const normalizedAddress = normalizePricingCity(value);
  const normalizedCityPart = normalizePricingCity(splitCityStateDisplay(value).city);

  if (!normalizedAddress && !normalizedCityPart) {
    return null;
  }

  const routeCities = Array.from(
    new Set(routes.flatMap((route) => [
      ...routeCityCandidates(route.originCity, route.originAliases),
      ...routeCityCandidates(route.destinationCity, route.destinationAliases),
    ]))
  ).sort((left, right) => right.length - left.length);

  return routeCities.find((city) => (
    containsLocationToken(normalizedCityPart, city) ||
    containsLocationToken(normalizedAddress, city)
  )) ?? null;
}

function detectCityForRouteQuote(value: string, detectedCity: string | null, routes: OutstationRouteLike[]) {
  if (detectedCity) {
    return detectedCity;
  }

  const routeCity = detectCityFromRouteList(value, routes);
  if (routeCity) {
    return routeCity;
  }

  const parsedLocation = splitCityStateDisplay(value);
  return value.includes(',') && parsedLocation.city ? normalizePricingCity(parsedLocation.city) : null;
}

function getRouteMatchDirection(route: OutstationRouteLike, pickupCity: string | null, dropoffCity: string | null) {
  const isForwardMatch =
    routeMatchesCity(pickupCity, route.originCity, route.originAliases) &&
    routeMatchesCity(dropoffCity, route.destinationCity, route.destinationAliases);

  if (isForwardMatch) {
    return 'forward' as const;
  }

  const isInverseMatch =
    route.isBidirectional !== false &&
    routeMatchesCity(pickupCity, route.destinationCity, route.destinationAliases) &&
    routeMatchesCity(dropoffCity, route.originCity, route.originAliases);

  return isInverseMatch ? 'inverse' as const : null;
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
  const routePickupCity = detectCityForRouteQuote(pickupLocation, classification.pickupCity, routes);
  const routeDropoffCity = detectCityForRouteQuote(dropoffLocation, classification.dropoffCity, routes);
  const routeClassification: TripClassification = {
    tripType: routePickupCity && routeDropoffCity && routePickupCity !== routeDropoffCity
      ? 'outstation'
      : classification.tripType,
    pickupCity: routePickupCity,
    dropoffCity: routeDropoffCity,
  };

  if (routeClassification.tripType !== 'outstation') {
    return {
      ...routeClassification,
      routeId: null,
      sedanPrice: null,
      ecoPrice: null,
      xlPrice: null,
      suvMarkup: null,
      matchedDirection: null,
      customPricingRequired: false,
    };
  }

  const routeMatch = routes.reduce<{
    route: OutstationRouteLike;
    matchedDirection: 'forward' | 'inverse';
  } | null>((match, route) => {
    if (match || !route.isActive) {
      return match;
    }

    const matchedDirection = getRouteMatchDirection(route, routeClassification.pickupCity, routeClassification.dropoffCity);

    return matchedDirection ? { route, matchedDirection } : null;
  }, null);

  if (!routeMatch) {
    return {
      ...routeClassification,
      routeId: null,
      sedanPrice: null,
      ecoPrice: null,
      xlPrice: null,
      suvMarkup: null,
      matchedDirection: null,
      customPricingRequired: true,
    };
  }

  const activeRoute = routeMatch.route;
  const sedanPrice = toNumber(activeRoute.sedanFare) ?? 0;
  const suvMarkup = toNumber(activeRoute.suvMarkup) ?? DEFAULT_OUTSTATION_SUV_MARKUP;

  return {
    ...routeClassification,
    routeId: activeRoute.id ?? null,
    sedanPrice,
    ecoPrice: getOutstationVehicleFare(sedanPrice, 'MILES_ECO', suvMarkup),
    xlPrice: getOutstationVehicleFare(sedanPrice, 'MILES_XL', suvMarkup),
    suvMarkup,
    matchedDirection: routeMatch.matchedDirection,
    customPricingRequired: false,
  };
}

export function serializeOutstationRoute(route: OutstationRouteLike) {
  const estimatedKm = toNumber(route.estimatedKm);

  return {
    id: route.id ?? '',
    originCity: formatPricingCityTitle(route.originCity),
    originState: normalizeIndianStateName(route.originState),
    destinationCity: formatPricingCityTitle(route.destinationCity),
    destinationState: normalizeIndianStateName(route.destinationState),
    originAliases: route.originAliases,
    destinationAliases: route.destinationAliases,
    sedanFare: toNumber(route.sedanFare) ?? 0,
    suvMarkup: toNumber(route.suvMarkup) ?? DEFAULT_OUTSTATION_SUV_MARKUP,
    estimatedKm,
    suggestedFare: toNumber(route.suggestedFare) ?? calculateSuggestedFare(estimatedKm),
    isActive: route.isActive,
    isBidirectional: route.isBidirectional,
    notes: route.notes ?? '',
    createdAt: route.createdAt instanceof Date ? route.createdAt.toISOString() : route.createdAt ?? '',
    updatedAt: route.updatedAt instanceof Date ? route.updatedAt.toISOString() : route.updatedAt ?? '',
  };
}
