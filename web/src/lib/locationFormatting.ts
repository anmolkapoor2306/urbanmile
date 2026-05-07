export type GeoapifyLocationLike = {
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  suburb?: string;
  district?: string;
  state?: string;
  state_code?: string;
  country?: string;
  result_type?: string;
};

export type CleanCityLocation = {
  city: string;
  state: string;
  displayName: string;
};

const INDIAN_STATE_NAMES_BY_CODE: Record<string, string> = {
  AP: 'Andhra Pradesh',
  AR: 'Arunachal Pradesh',
  AS: 'Assam',
  BR: 'Bihar',
  CG: 'Chhattisgarh',
  CH: 'Chandigarh',
  DD: 'Dadra And Nagar Haveli And Daman And Diu',
  DL: 'Delhi',
  GA: 'Goa',
  GJ: 'Gujarat',
  HR: 'Haryana',
  HP: 'Himachal Pradesh',
  JH: 'Jharkhand',
  JK: 'Jammu And Kashmir',
  KA: 'Karnataka',
  KL: 'Kerala',
  LA: 'Ladakh',
  LD: 'Lakshadweep',
  MH: 'Maharashtra',
  ML: 'Meghalaya',
  MN: 'Manipur',
  MP: 'Madhya Pradesh',
  MZ: 'Mizoram',
  NL: 'Nagaland',
  OD: 'Odisha',
  OR: 'Odisha',
  PB: 'Punjab',
  PY: 'Puducherry',
  RJ: 'Rajasthan',
  SK: 'Sikkim',
  TN: 'Tamil Nadu',
  TS: 'Telangana',
  TG: 'Telangana',
  TR: 'Tripura',
  UK: 'Uttarakhand',
  UP: 'Uttar Pradesh',
  UT: 'Uttarakhand',
  WB: 'West Bengal',
};

const COMMON_STATE_NAMES: Record<string, string> = {
  'andhra pradesh': 'Andhra Pradesh',
  'arunachal pradesh': 'Arunachal Pradesh',
  assam: 'Assam',
  bihar: 'Bihar',
  chandigarh: 'Chandigarh',
  chhattisgarh: 'Chhattisgarh',
  delhi: 'Delhi',
  goa: 'Goa',
  gujarat: 'Gujarat',
  haryana: 'Haryana',
  'himachal pradesh': 'Himachal Pradesh',
  jharkhand: 'Jharkhand',
  'jammu and kashmir': 'Jammu And Kashmir',
  karnataka: 'Karnataka',
  kerala: 'Kerala',
  ladakh: 'Ladakh',
  lakshadweep: 'Lakshadweep',
  'madhya pradesh': 'Madhya Pradesh',
  maharashtra: 'Maharashtra',
  manipur: 'Manipur',
  meghalaya: 'Meghalaya',
  mizoram: 'Mizoram',
  nagaland: 'Nagaland',
  odisha: 'Odisha',
  orissa: 'Odisha',
  puducherry: 'Puducherry',
  punjab: 'Punjab',
  rajasthan: 'Rajasthan',
  sikkim: 'Sikkim',
  'tamil nadu': 'Tamil Nadu',
  telangana: 'Telangana',
  tripura: 'Tripura',
  uttarakhand: 'Uttarakhand',
  'uttar pradesh': 'Uttar Pradesh',
  'west bengal': 'West Bengal',
};

const KNOWN_INDIAN_CITY_STATES: Record<string, string> = {
  adampur: 'Punjab',
  'adampur airport': 'Punjab',
  ambala: 'Haryana',
  amritsar: 'Punjab',
  batala: 'Punjab',
  chandigarh: 'Chandigarh',
  delhi: 'Delhi',
  'delhi airport': 'Delhi',
  'delhi city': 'Delhi',
  ferozepur: 'Punjab',
  firozpur: 'Punjab',
  hoshiarpur: 'Punjab',
  jaipur: 'Rajasthan',
  jalandhar: 'Punjab',
  jammu: 'Jammu And Kashmir',
  ludhiana: 'Punjab',
  meerut: 'Uttar Pradesh',
  moga: 'Punjab',
  nawanshahr: 'Punjab',
  'new delhi': 'Delhi',
  panchkula: 'Haryana',
  patiala: 'Punjab',
  pathankot: 'Punjab',
  rajpura: 'Punjab',
  roopnagar: 'Punjab',
  tarn: 'Punjab',
  'tarn taran': 'Punjab',
  zirakpur: 'Punjab',
};

export function formatNameTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function normalizeIndianStateName(value: string | null | undefined) {
  const cleaned = value?.replace(/[^a-zA-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return '';
  }

  const upper = cleaned.toUpperCase();
  if (INDIAN_STATE_NAMES_BY_CODE[upper]) {
    return INDIAN_STATE_NAMES_BY_CODE[upper];
  }

  return COMMON_STATE_NAMES[cleaned.toLowerCase()] ?? formatNameTitle(cleaned);
}

export function formatCityStateDisplay(city: string, state?: string | null) {
  const cleanCity = formatNameTitle(city);
  const cleanState = normalizeIndianStateName(state);

  return cleanState ? `${cleanCity}, ${cleanState}` : cleanCity;
}

export function getKnownIndianCityState(city: string | null | undefined) {
  const normalizedCity = city?.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  return normalizedCity ? KNOWN_INDIAN_CITY_STATES[normalizedCity] ?? '' : '';
}

export function splitCityStateDisplay(value: string): CleanCityLocation {
  const [cityPart, statePart] = value.split(',').map((part) => part.trim());
  const city = formatNameTitle(cityPart || value);
  const state = normalizeIndianStateName(statePart);

  return {
    city,
    state,
    displayName: formatCityStateDisplay(city, state),
  };
}

export function cleanGeoapifyCityLocation(result: GeoapifyLocationLike): CleanCityLocation | null {
  const rawCity = getGeoapifyCityName(result);
  if (!rawCity) {
    return null;
  }

  const city = normalizeDelhiCityName(rawCity, result);
  const state = normalizeIndianStateName(result.state || result.state_code || getKnownIndianCityState(city));

  return {
    city,
    state,
    displayName: formatCityStateDisplay(city, state),
  };
}

function getGeoapifyCityName(result: GeoapifyLocationLike) {
  return (
    result.city ||
    result.town ||
    result.village ||
    result.municipality ||
    result.county ||
    result.suburb ||
    result.district ||
    result.address_line1 ||
    result.formatted?.split(',')[0] ||
    ''
  ).trim();
}

function normalizeDelhiCityName(city: string, result: GeoapifyLocationLike) {
  const normalizedCity = city.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const formatted = [result.formatted, result.address_line1, result.address_line2].join(' ').toLowerCase();

  if (['delhi', 'new delhi', 'delhi city'].includes(normalizedCity)) {
    return formatted.includes('airport') ? 'Delhi Airport' : 'Delhi City';
  }

  return formatNameTitle(city);
}
