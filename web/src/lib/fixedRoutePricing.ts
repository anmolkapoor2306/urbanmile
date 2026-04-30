export type FixedRoutePrice = {
  pickupCity: string;
  dropoffCity: string;
  sedanPrice: number;
};

export const FIXED_CITY_SUGGESTIONS = [
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

const CITY_ALIASES: Record<string, string> = {
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
  frojpur: 'firozpur',
  firozpur: 'firozpur',
  ferozepur: 'firozpur',
  tarantaran: 'tarn taran',
  'tarn taran': 'tarn taran',
  ropar: 'roopnagar',
  roopnagar: 'roopnagar',
  amritsar: 'amritsar',
  zirakpur: 'zirakpur',
  panchkula: 'panchkula',
  nawanshahr: 'nawanshahr',
  ludhiana: 'ludhiana',
  patiala: 'patiala',
  rajpura: 'rajpura',
  pathankot: 'pathankot',
  jammu: 'jammu',
  moga: 'moga',
  hoshiarpur: 'hoshiarpur',
  'adampur airport': 'adampur airport',
  batala: 'batala',
  ambala: 'ambala',
};

const FIXED_SEDAN_ROUTES: Array<[string, string, number]> = [
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

export function normalizeLocation(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(india|punjab)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return CITY_ALIASES[normalized] ?? normalized;
}

function matchesCity(input: string, city: string) {
  return normalizeLocation(input) === normalizeLocation(city);
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

export function getFixedRoutePrice(pickupLocation: string, dropoffLocation: string): FixedRoutePrice | null {
  const pickupCity = normalizeLocation(pickupLocation);
  const dropoffCity = normalizeLocation(dropoffLocation);

  for (const [origin, destination, sedanPrice] of FIXED_SEDAN_ROUTES) {
    const isForward = matchesCity(pickupCity, origin) && matchesCity(dropoffCity, destination);
    const isReverse = matchesCity(pickupCity, destination) && matchesCity(dropoffCity, origin);

    if (isForward || isReverse) {
      return {
        pickupCity,
        dropoffCity,
        sedanPrice,
      };
    }
  }

  return null;
}
