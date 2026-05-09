export type RouteLocationInput = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

export function formatCoordinatePair(latitude?: number | null, longitude?: number | null) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return 'Coordinates unavailable';
  }

  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function buildGoogleMapsRouteUrl(origin: RouteLocationInput, destination: RouteLocationInput) {
  const params = new URLSearchParams({
    api: '1',
    origin: toMapsLocationValue(origin),
    destination: toMapsLocationValue(destination),
    travelmode: 'driving',
  });

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function toMapsLocationValue(location: RouteLocationInput) {
  if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
    return `${location.latitude},${location.longitude}`;
  }

  return location.address;
}
