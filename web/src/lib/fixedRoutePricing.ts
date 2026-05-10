import {
  JALANDHAR_OUTSTATION_SEDAN_ROUTES,
  OUTSTATION_CITY_SUGGESTIONS,
  classifyTripType,
  detectCityFromAddress,
  getOutstationVehicleFare,
  normalizePricingCity,
  quoteOutstationRouteFromRoutes,
  type OutstationVehicle,
  type TripClassification,
  type TripType,
} from '@/lib/outstationPricing';
import type { TripOverrideDebugInfo } from '@/lib/tripOverrides';

export type FixedRoutePrice = {
  pickupCity: string;
  dropoffCity: string;
  sedanPrice: number;
  suvMarkup?: number;
  routeId?: string | null;
  priceSource?: 'override' | 'route' | 'coordinate' | 'static' | 'calculated';
  tripOverrideId?: string | null;
  overrideDebug?: TripOverrideDebugInfo;
};

export type {
  OutstationVehicle,
  TripClassification,
  TripType,
};

export { classifyTripType, detectCityFromAddress, getOutstationVehicleFare };

export const FIXED_CITY_SUGGESTIONS = OUTSTATION_CITY_SUGGESTIONS;

export const JALANDHAR_STATIC_OUTSTATION_ROUTES = JALANDHAR_OUTSTATION_SEDAN_ROUTES.map(
  ([originCity, destinationCity, sedanFare]) => ({
    originCity,
    destinationCity,
    originAliases: [originCity],
    destinationAliases: [destinationCity],
    sedanFare,
    suvMarkup: 1000,
    estimatedKm: null,
    suggestedFare: null,
    isActive: true,
    isBidirectional: true,
  })
);

export function normalizeLocation(value: string): string {
  return normalizePricingCity(value);
}

export function getFixedCitySuggestions(query: string): string[] {
  const normalizedQuery = normalizeLocation(query);
  const cleanedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();

  if (!cleanedQuery) {
    return [];
  }

  return FIXED_CITY_SUGGESTIONS.filter((city) => {
    const normalizedCity = normalizeLocation(city);
    const cityLabel = city.toLowerCase();

    return (
      normalizedCity.includes(normalizedQuery) ||
      cityLabel.includes(cleanedQuery) ||
      normalizedCity.startsWith(normalizedQuery)
    );
  });
}

export function getFixedRoutePrice(
  pickupLocation: string,
  dropoffLocation: string,
  options?: { distanceKm?: number | null }
): FixedRoutePrice | null {
  const quote = quoteOutstationRouteFromRoutes({
    routes: JALANDHAR_STATIC_OUTSTATION_ROUTES,
    pickupLocation,
    dropoffLocation,
    distanceKm: options?.distanceKm,
  });

  if (quote.sedanPrice === null) {
    return null;
  }

  return {
      pickupCity: quote.pickupCity ?? normalizeLocation(pickupLocation),
      dropoffCity: quote.dropoffCity ?? normalizeLocation(dropoffLocation),
      sedanPrice: quote.sedanPrice,
      suvMarkup: quote.suvMarkup ?? 1000,
      routeId: quote.routeId,
      priceSource: 'static',
      tripOverrideId: null,
    };
  }
