export type AddressSuggestion = {
  id: string;
  label: string;
  description: string;
  latitude: number;
  longitude: number;
};

type GeoapifyResult = {
  formatted?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  lat?: number;
  lon?: number;
  place_id?: string;
};

type GeoapifyResponse = {
  results?: GeoapifyResult[];
};

type NominatimResult = {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
};

const GEOAPIFY_API_KEY =
  process.env.EXPO_PUBLIC_GEOAPIFY_API_KEY ?? process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? '';

export async function fetchAddressSuggestions(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];

  if (GEOAPIFY_API_KEY) {
    return fetchGeoapifySuggestions(trimmedQuery, signal);
  }

  return fetchNominatimSuggestions(trimmedQuery, signal);
}

export async function reverseGeocodeCoordinates(latitude: number, longitude: number): Promise<string | null> {
  if (GEOAPIFY_API_KEY) {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'json',
      lang: 'en',
      apiKey: GEOAPIFY_API_KEY,
    });

    const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`);
    if (!response.ok) return null;
    const data = (await response.json()) as GeoapifyResponse;
    return data.results?.[0]?.formatted?.trim() || null;
  }

  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
  if (!response.ok) return null;
  const data = (await response.json()) as NominatimResult;
  return data.display_name?.trim() || null;
}

async function fetchGeoapifySuggestions(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    text: query,
    format: 'json',
    limit: '6',
    lang: 'en',
    filter: 'countrycode:in',
    apiKey: GEOAPIFY_API_KEY,
  });

  const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error('Address autocomplete failed');
  }

  const data = (await response.json()) as GeoapifyResponse;
  return (data.results ?? [])
    .map((result, index): AddressSuggestion | null => {
      if (typeof result.lat !== 'number' || typeof result.lon !== 'number') return null;
      const label = result.address_line1 || result.city || result.formatted || 'Selected location';
      const description = result.address_line2 || result.state || result.formatted || 'India';

      return {
        id: result.place_id || `geoapify-${index}`,
        label,
        description,
        latitude: result.lat,
        longitude: result.lon,
      };
    })
    .filter((suggestion): suggestion is AddressSuggestion => Boolean(suggestion));
}

async function fetchNominatimSuggestions(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
    countrycodes: 'in',
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error('Address autocomplete failed');
  }

  const data = (await response.json()) as NominatimResult[];
  return data
    .map((result): AddressSuggestion | null => {
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      const address = result.address;
      const label = address?.city || address?.town || address?.village || result.display_name?.split(',')[0] || 'Selected location';
      const description = result.display_name || [address?.state, 'India'].filter(Boolean).join(', ');

      return {
        id: String(result.place_id ?? result.display_name ?? `${latitude}-${longitude}`),
        label,
        description,
        latitude,
        longitude,
      };
    })
    .filter((suggestion): suggestion is AddressSuggestion => Boolean(suggestion));
}
