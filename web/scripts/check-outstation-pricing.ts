import {
  JALANDHAR_OUTSTATION_SEED_ROUTES,
  calculateSuggestedFare,
  quoteOutstationRouteFromRoutes,
  getOutstationVehicleFare,
} from '../src/lib/outstationPricing';

type PricingCheck = {
  label: string;
  actual: unknown;
  expected: unknown;
};

const checks: PricingCheck[] = [
  {
    label: 'Jalandhar to Delhi City Eco',
    actual: quoteOutstationRouteFromRoutes({
      routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
      pickupLocation: 'Jalandhar',
      dropoffLocation: 'Delhi City',
    }).ecoPrice,
    expected: 6300,
  },
  {
    label: 'Delhi City to Jalandhar Eco',
    actual: quoteOutstationRouteFromRoutes({
      routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
      pickupLocation: 'Delhi City',
      dropoffLocation: 'Jalandhar',
    }).ecoPrice,
    expected: 6300,
  },
  {
    label: 'Jalandhar to Delhi City XL',
    actual: quoteOutstationRouteFromRoutes({
      routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
      pickupLocation: 'Jalandhar',
      dropoffLocation: 'Delhi City',
    }).xlPrice,
    expected: 7300,
  },
  {
    label: 'Delhi City to Jalandhar XL',
    actual: quoteOutstationRouteFromRoutes({
      routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
      pickupLocation: 'Delhi City',
      dropoffLocation: 'Jalandhar',
    }).xlPrice,
    expected: 7300,
  },
  {
    label: 'Jalandhar to Delhi Airport Eco',
    actual: quoteOutstationRouteFromRoutes({
      routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
      pickupLocation: 'Jal',
      dropoffLocation: 'IGI Airport',
    }).ecoPrice,
    expected: 6000,
  },
  {
    label: 'Delhi Airport to Jalandhar Eco',
    actual: quoteOutstationRouteFromRoutes({
      routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
      pickupLocation: 'Delhi Airport',
      dropoffLocation: 'Jalandhar',
    }).ecoPrice,
    expected: 6000,
  },
  {
    label: 'Jalandhar to Chandigarh Eco',
    actual: quoteOutstationRouteFromRoutes({
      routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
      pickupLocation: 'Jalandhar, Punjab',
      dropoffLocation: 'Chd',
    }).ecoPrice,
    expected: 2500,
  },
  {
    label: 'Chandigarh to Jalandhar Eco',
    actual: quoteOutstationRouteFromRoutes({
      routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
      pickupLocation: 'Chandigarh',
      dropoffLocation: 'Jalandhar',
    }).ecoPrice,
    expected: 2500,
  },
  {
    label: 'Chandigarh to Jalandhar direction',
    actual: quoteOutstationRouteFromRoutes({
      routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
      pickupLocation: 'Chandigarh',
      dropoffLocation: 'Jalandhar',
    }).matchedDirection,
    expected: 'inverse',
  },
  {
    label: 'Jalandhar to Chandigarh XL',
    actual: getOutstationVehicleFare(
      quoteOutstationRouteFromRoutes({
        routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
        pickupLocation: 'Jalandhar',
        dropoffLocation: 'Chandigarh',
      }).sedanPrice ?? 0,
      'MILES_XL'
    ),
    expected: 3500,
  },
  {
    label: 'Unknown route custom pricing',
    actual: quoteOutstationRouteFromRoutes({
      routes: JALANDHAR_OUTSTATION_SEED_ROUTES,
      pickupLocation: 'Jalandhar',
      dropoffLocation: 'Mumbai',
      distanceKm: 120,
    }).customPricingRequired,
    expected: true,
  },
  {
    label: 'Admin suggested fare for 400 km',
    actual: calculateSuggestedFare(400),
    expected: 6400,
  },
];

for (const check of checks) {
  if (check.actual !== check.expected) {
    throw new Error(`${check.label}: expected ${String(check.expected)}, got ${String(check.actual)}`);
  }
}

console.log('Outstation pricing checks passed');
