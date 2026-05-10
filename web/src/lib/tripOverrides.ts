export type TripOverrideMarkupType = 'percentage' | 'flat';

export type TripOverride = {
  id: string;
  fromCity: string;
  toCity: string;
  fixedPrice: string;
  milesXlMarkupType: TripOverrideMarkupType;
  milesXlMarkupValue: string;
  includeReverse: boolean;
  isActive: boolean;
};

export type TripOverrideDraft = Omit<TripOverride, 'id'>;

export type TripOverrideMatch = {
  override: TripOverride;
  matchedDirection: 'forward' | 'reverse';
  pickupCity: string;
  dropoffCity: string;
};

export type TripOverrideDebugInfo = {
  pickupAddress: string;
  dropoffAddress: string;
  pickupCity: string | null;
  dropoffCity: string | null;
  loadedOverrideCount: number;
  activeOverrideCount: number;
  loadedOverrides: Array<Pick<TripOverride, 'id' | 'fromCity' | 'toCity' | 'fixedPrice' | 'milesXlMarkupType' | 'milesXlMarkupValue' | 'includeReverse' | 'isActive'>>;
  matchedOverrideId: string | null;
  matchedDirection: TripOverrideMatch['matchedDirection'] | null;
  finalFareSource: 'override' | 'calculated';
};

const CITY_ALIAS_GROUPS: Record<string, string[]> = {
  delhi: ['delhi', 'new delhi', 'dl', 'nct delhi', 'delhi city'],
  jalandhar: ['jalandhar', 'jala ndhar'],
  amritsar: ['amritsar'],
  ludhiana: ['ludhiana'],
  chandigarh: ['chandigarh'],
};

const CITY_ALIAS_ENTRIES = Object.entries(CITY_ALIAS_GROUPS)
  .flatMap(([city, aliases]) => aliases.map((alias) => ({ city, alias: normalizeAddressText(alias) })))
  .filter(({ alias }) => Boolean(alias))
  .sort((left, right) => right.alias.length - left.alias.length);

export function sanitizeTripOverrides(value: unknown): TripOverride[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeTripOverride(item))
    .filter((override): override is TripOverride => Boolean(override));
}

export function sanitizeTripOverride(value: unknown): TripOverride | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Partial<TripOverride>;
  const draft = sanitizeTripOverrideDraft(record);

  if (
    !record.id ||
    !normalizeCityName(draft.fromCity) ||
    !normalizeCityName(draft.toCity) ||
    getTripOverridePrice(draft.fixedPrice) <= 0
  ) {
    return null;
  }

  return {
    id: String(record.id),
    ...draft,
  };
}

export function sanitizeTripOverrideDraft(value: Partial<TripOverrideDraft>): TripOverrideDraft {
  const legacyValue = value as Partial<TripOverrideDraft> & {
    basePrice?: unknown;
    sedanPrice?: unknown;
    milesXlMarkup?: unknown;
    vehicleMarkupType?: unknown;
    vehicleMarkupValue?: unknown;
    reverseRoute?: boolean;
    active?: boolean;
  };

  return {
    fromCity: formatTripOverrideCityName(value.fromCity),
    toCity: formatTripOverrideCityName(value.toCity),
    fixedPrice: sanitizeNumericInputDraft(value.fixedPrice ?? legacyValue.sedanPrice ?? legacyValue.basePrice),
    milesXlMarkupType: normalizeTripOverrideMarkupType(
      value.milesXlMarkupType ?? legacyValue.vehicleMarkupType
    ),
    milesXlMarkupValue:
      sanitizeNumericInputDraft(
        value.milesXlMarkupValue ?? legacyValue.milesXlMarkup ?? legacyValue.vehicleMarkupValue
      ) || '0',
    includeReverse: value.includeReverse ?? legacyValue.reverseRoute ?? true,
    isActive: value.isActive ?? legacyValue.active ?? true,
  };
}

export function sanitizeCityDisplayName(value?: string | null) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function normalizeCityName(value: string) {
  return extractCityFromAddressOrText(value) ?? normalizeAddressText(extractProbableCityText(value) ?? value);
}

export function extractCityFromAddressOrText(input: string | null | undefined) {
  const value = input ?? '';
  const normalizedAddress = normalizeAddressText(value);
  const compactAddress = normalizedAddress.replace(/\s/g, '');

  if (!normalizedAddress) {
    return null;
  }

  for (const { city, alias } of CITY_ALIAS_ENTRIES) {
    const compactAlias = alias.replace(/\s/g, '');

    if (
      containsLocationToken(normalizedAddress, alias) ||
      normalizedAddress.includes(alias) ||
      compactAddress.includes(compactAlias)
    ) {
      return city;
    }
  }

  const probableCityText = extractProbableCityText(value);
  return probableCityText ? normalizeAddressText(probableCityText) : null;
}

export function formatTripOverrideCityName(input: string | null | undefined) {
  const value = sanitizeCityDisplayName(input);

  if (!value) {
    return '';
  }

  const city = extractCityFromAddressOrText(value) ?? normalizeAddressText(value);
  return toTitleCaseCity(city);
}

export function extractCityFromAddress(addressText: string) {
  return extractCityFromAddressOrText(addressText);
}

export function matchTripOverride(
  overrides: TripOverride[],
  pickupAddress: string,
  dropoffAddress: string
): TripOverrideMatch | null {
  const pickupCity = extractCityFromAddress(pickupAddress);
  const dropoffCity = extractCityFromAddress(dropoffAddress);

  if (!pickupCity || !dropoffCity) {
    return null;
  }

  for (const override of overrides) {
    if (
      !override.isActive ||
      getTripOverridePrice(override.fixedPrice) <= 0
    ) {
      continue;
    }

    const fromCity = normalizeCityName(override.fromCity);
    const toCity = normalizeCityName(override.toCity);

    if (pickupCity === fromCity && dropoffCity === toCity) {
      return {
        override,
        matchedDirection: 'forward',
        pickupCity,
        dropoffCity,
      };
    }

    if (!override.includeReverse) {
      continue;
    }

    if (pickupCity === toCity && dropoffCity === fromCity) {
      return {
        override,
        matchedDirection: 'reverse',
        pickupCity,
        dropoffCity,
      };
    }
  }

  return null;
}

export function findMatchingTripOverride(
  overrides: TripOverride[],
  pickupAddress: string,
  dropoffAddress: string
) {
  return matchTripOverride(overrides, pickupAddress, dropoffAddress)?.override ?? null;
}

export function extractMatchedCity(address: string, candidateCities: string[]) {
  const extractedCity = extractCityFromAddress(address);

  if (!extractedCity) {
    return null;
  }

  return candidateCities.find((city) => normalizeCityName(city) === extractedCity) ?? null;
}

export function addressContainsCity(address: string, city: string) {
  return extractCityFromAddress(address) === normalizeCityName(city);
}

export function createTripOverrideDebugInfo({
  overrides,
  pickupAddress,
  dropoffAddress,
  match,
  finalFareSource,
}: {
  overrides: TripOverride[];
  pickupAddress: string;
  dropoffAddress: string;
  match: TripOverrideMatch | null;
  finalFareSource: TripOverrideDebugInfo['finalFareSource'];
}): TripOverrideDebugInfo {
  return {
    pickupAddress,
    dropoffAddress,
    pickupCity: extractCityFromAddress(pickupAddress),
    dropoffCity: extractCityFromAddress(dropoffAddress),
    loadedOverrideCount: overrides.length,
    activeOverrideCount: overrides.filter((override) => override.isActive).length,
    loadedOverrides: overrides.map((override) => ({
      id: override.id,
      fromCity: override.fromCity,
      toCity: override.toCity,
      fixedPrice: override.fixedPrice,
      milesXlMarkupType: override.milesXlMarkupType,
      milesXlMarkupValue: override.milesXlMarkupValue,
      includeReverse: override.includeReverse,
      isActive: override.isActive,
    })),
    matchedOverrideId: match?.override.id ?? null,
    matchedDirection: match?.matchedDirection ?? null,
    finalFareSource,
  };
}

export function logTripOverrideDebug(label: string, debugInfo: TripOverrideDebugInfo) {
  const payload = {
    pickupFormattedAddress: debugInfo.pickupAddress,
    dropoffFormattedAddress: debugInfo.dropoffAddress,
    extractedPickupCity: debugInfo.pickupCity,
    extractedDropoffCity: debugInfo.dropoffCity,
    loadedOverrides: debugInfo.loadedOverrides,
    matchedOverrideId: debugInfo.matchedOverrideId,
    finalFareSource: debugInfo.finalFareSource,
  };

  console.info(`[Trip Override] ${label}: ${JSON.stringify(payload)}`);
}

export function tripOverridesConflict(left: TripOverride, right: TripOverride) {
  const leftPairs = getTripOverridePairKeys(left);
  const rightPairs = getTripOverridePairKeys(right);

  return leftPairs.some((pair) => rightPairs.includes(pair));
}

export function createTripOverrideId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getTripOverridePrice(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getTripOverrideSedanPrice(override: Pick<TripOverride, 'fixedPrice'>) {
  return getTripOverridePrice(override.fixedPrice);
}

export function calculateTripOverrideMilesXlPrice(override: TripOverride) {
  const sedanPrice = getTripOverrideSedanPrice(override);
  const markup = getTripOverridePrice(override.milesXlMarkupValue);
  const finalPrice =
    override.milesXlMarkupType === 'percentage'
      ? sedanPrice + (sedanPrice * markup) / 100
      : sedanPrice + markup;

  return roundCurrency(Math.max(0, finalPrice));
}

export function getTripOverrideMilesXlMarkupAmount(override: TripOverride) {
  return roundCurrency(Math.max(0, calculateTripOverrideMilesXlPrice(override) - getTripOverrideSedanPrice(override)));
}

export function formatTripOverrideMilesXlMarkup(override: Pick<TripOverride, 'milesXlMarkupType' | 'milesXlMarkupValue'>) {
  const markup = getTripOverridePrice(override.milesXlMarkupValue);

  if (override.milesXlMarkupType === 'percentage') {
    return `${formatCompactNumber(markup)}%`;
  }

  return `₹${formatCompactNumber(markup)}`;
}

function normalizeTripOverrideMarkupType(value: unknown): TripOverrideMarkupType {
  return value === 'flat' ? 'flat' : 'percentage';
}

function normalizeAddressText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(india|punjab|pb|haryana|uttar pradesh)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsLocationToken(value: string, token: string) {
  return (
    value === token ||
    value.startsWith(`${token} `) ||
    value.endsWith(` ${token}`) ||
    value.includes(` ${token} `)
  );
}

function extractProbableCityText(value: string) {
  const parts = value
    .split(',')
    .map((part) => normalizeAddressText(part))
    .filter(Boolean);

  if (parts.length <= 1) {
    return null;
  }

  const ignoredSegments = new Set(['india', 'punjab', 'pb', 'haryana', 'uttar pradesh']);

  return (
    [...parts]
      .reverse()
      .find((part) => {
        if (ignoredSegments.has(part)) {
          return false;
        }

        if (/^\d{4,}$/.test(part) || /\b\d{4,}\b/.test(part)) {
          return false;
        }

        return /[a-z]/.test(part);
      }) ?? null
  );
}

function toTitleCaseCity(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getTripOverridePairKeys(override: Pick<TripOverride, 'fromCity' | 'toCity' | 'includeReverse'>) {
  const fromCity = normalizeCityName(override.fromCity);
  const toCity = normalizeCityName(override.toCity);

  if (!fromCity || !toCity) {
    return [];
  }

  const pairs = [createTripOverridePairKey(fromCity, toCity)];
  if (override.includeReverse) {
    pairs.push(createTripOverridePairKey(toCity, fromCity));
  }

  return pairs;
}

function createTripOverridePairKey(fromCity: string, toCity: string) {
  return `${fromCity}->${toCity}`;
}

function sanitizeNumericInputDraft(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(getTripOverridePrice(value));
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}
