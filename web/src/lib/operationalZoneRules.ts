export const OPERATIONAL_ZONE_STATUSES = ['ENABLED', 'LIMITED', 'DISABLED'] as const;
export const OPERATIONAL_VEHICLE_TYPES = ['SEDAN', 'SUV', 'PREMIUM'] as const;
export const PICKUP_UNSERVICEABLE_MESSAGE = 'Service is not available in this pickup area yet.';
export const PICKUP_MANUAL_CONFIRMATION_MESSAGE = 'This area requires manual confirmation.';

export type OperationalZoneStatus = (typeof OPERATIONAL_ZONE_STATUSES)[number];
export type OperationalVehicleType = (typeof OPERATIONAL_VEHICLE_TYPES)[number];

export type SerializedOperationalZone = {
  id: string;
  city: string;
  status: OperationalZoneStatus;
  airportEnabled: boolean;
  outstationEnabled: boolean;
  autoDispatchEnabled: boolean;
  enabledVehicleTypes: OperationalVehicleType[];
  serviceRadiusKm: number;
  createdAt: string;
  updatedAt: string;
};

export type OperationalZoneBookingInput = {
  pickupLocation: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropoffLocation?: string | null;
  carType?: string | null;
  bookingMode?: string | null;
};

export type OperationalZoneValidationResult =
  | { ok: true; zone: SerializedOperationalZone }
  | { ok: false; zone: SerializedOperationalZone | null; code: string; message: string };

export type PickupServiceabilityResult =
  | {
      serviceable: true;
      confirmation: 'instant';
      zone: SerializedOperationalZone;
      code: 'ZONE_ENABLED';
      message: null;
    }
  | {
      serviceable: true;
      confirmation: 'manual';
      zone: SerializedOperationalZone;
      code: 'ZONE_LIMITED';
      message: typeof PICKUP_MANUAL_CONFIRMATION_MESSAGE;
    }
  | {
      serviceable: false;
      confirmation: 'blocked';
      zone: SerializedOperationalZone | null;
      code: string;
      message: typeof PICKUP_UNSERVICEABLE_MESSAGE;
    };

export function normalizeOperationalZoneText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function mapCarTypeToOperationalVehicleType(carType: string | null | undefined): OperationalVehicleType {
  switch ((carType ?? '').toUpperCase()) {
    case 'SUV':
    case 'VAN':
      return 'SUV';
    case 'LUXURY':
      return 'PREMIUM';
    case 'SEDAN':
    default:
      return 'SEDAN';
  }
}

export function isAirportRide(input: OperationalZoneBookingInput) {
  const text = normalizeOperationalZoneText(`${input.pickupLocation} ${input.dropoffLocation ?? ''}`);
  return /\bairport\b|\bterminal\b|\bigi\b|\batq\b|\bixc\b|\bdel\b/.test(text);
}

export function isOutstationRide(input: OperationalZoneBookingInput) {
  if ((input.bookingMode ?? '').toUpperCase() === 'ROUND_TRIP') return true;

  const pickupCity = extractLikelyCity(input.pickupLocation);
  const dropoffCity = extractLikelyCity(input.dropoffLocation ?? '');
  return Boolean(pickupCity && dropoffCity && pickupCity !== dropoffCity);
}

export function findMatchingOperationalZone(
  zones: SerializedOperationalZone[],
  pickupLocation: string
): SerializedOperationalZone | null {
  const normalizedPickup = normalizeOperationalZoneText(pickupLocation);
  if (!normalizedPickup) return null;

  const cityMatches = zones
    .filter((zone) => {
      const city = normalizeOperationalZoneText(zone.city);
      return city && normalizedPickup.includes(city);
    })
    .sort((a, b) => normalizeOperationalZoneText(b.city).length - normalizeOperationalZoneText(a.city).length);

  return cityMatches[0] ?? null;
}

export function validateOperationalZoneForBooking(
  zones: SerializedOperationalZone[],
  input: OperationalZoneBookingInput
): OperationalZoneValidationResult {
  const serviceability = isPickupServiceable(
    zones,
    input.pickupLocation,
    input.pickupLatitude,
    input.pickupLongitude,
    input.carType,
    input.bookingMode,
    input.dropoffLocation
  );

  if (!serviceability.serviceable) {
    return {
      ok: false,
      zone: serviceability.zone,
      code: serviceability.code,
      message: serviceability.message,
    };
  }

  return { ok: true, zone: serviceability.zone };
}

export function isBookingDispatchableByZone(
  zones: SerializedOperationalZone[],
  booking: Pick<OperationalZoneBookingInput, 'pickupLocation' | 'pickupLatitude' | 'pickupLongitude' | 'dropoffLocation' | 'carType'>
) {
  const serviceability = isPickupServiceable(
    zones,
    booking.pickupLocation,
    booking.pickupLatitude,
    booking.pickupLongitude,
    booking.carType,
    'ONE_WAY',
    booking.dropoffLocation
  );

  return serviceability.serviceable && serviceability.confirmation === 'instant' && serviceability.zone.autoDispatchEnabled;
}

export function isPickupServiceable(
  zones: SerializedOperationalZone[],
  pickupAddress: string,
  pickupLat?: number | null,
  pickupLng?: number | null,
  vehicleType?: string | null,
  rideType?: string | null,
  dropoffAddress?: string | null
): PickupServiceabilityResult {
  const input: OperationalZoneBookingInput = {
    pickupLocation: pickupAddress,
    pickupLatitude: pickupLat,
    pickupLongitude: pickupLng,
    carType: vehicleType,
    bookingMode: rideType,
    dropoffLocation: dropoffAddress,
  };
  const zone = findMatchingOperationalZone(zones, pickupAddress);

  if (!zone) {
    return serviceUnavailable(null, 'ZONE_UNSUPPORTED');
  }

  if (zone.status === 'DISABLED') {
    return serviceUnavailable(zone, 'ZONE_DISABLED');
  }

  if (!isPickupWithinServiceRadius(zone, input)) {
    return serviceUnavailable(zone, 'ZONE_RADIUS_EXCEEDED');
  }

  const mappedVehicleType = mapCarTypeToOperationalVehicleType(vehicleType);
  if (!zone.enabledVehicleTypes.includes(mappedVehicleType)) {
    return serviceUnavailable(zone, 'VEHICLE_TYPE_UNSUPPORTED');
  }

  if (isAirportRide(input) && !zone.airportEnabled) {
    return serviceUnavailable(zone, 'AIRPORT_UNSUPPORTED');
  }

  const dropoffZone = dropoffAddress ? findMatchingOperationalZone(zones, dropoffAddress) : null;
  const rideIsOutstation = dropoffZone
    ? normalizeOperationalZoneText(dropoffZone.city) !== normalizeOperationalZoneText(zone.city)
    : isOutstationRide(input);

  if (rideIsOutstation && !zone.outstationEnabled) {
    return serviceUnavailable(zone, 'OUTSTATION_UNSUPPORTED');
  }

  if (zone.status === 'LIMITED') {
    return {
      serviceable: true,
      confirmation: 'manual',
      zone,
      code: 'ZONE_LIMITED',
      message: PICKUP_MANUAL_CONFIRMATION_MESSAGE,
    };
  }

  return {
    serviceable: true,
    confirmation: 'instant',
    zone,
    code: 'ZONE_ENABLED',
    message: null,
  };
}

function serviceUnavailable(zone: SerializedOperationalZone | null, code: string): PickupServiceabilityResult {
  return {
    serviceable: false,
    confirmation: 'blocked',
    zone,
    code,
    message: PICKUP_UNSERVICEABLE_MESSAGE,
  };
}

export function isPickupWithinServiceRadius(zone: SerializedOperationalZone, input: OperationalZoneBookingInput) {
  const { pickupLatitude, pickupLongitude } = input;
  if (
    typeof pickupLatitude !== 'number' ||
    !Number.isFinite(pickupLatitude) ||
    typeof pickupLongitude !== 'number' ||
    !Number.isFinite(pickupLongitude)
  ) {
    return true;
  }

  const center = getCityCenterCoordinates(zone.city);
  if (!center) return true;

  const distanceKm = calculateDistanceKm(
    { latitude: pickupLatitude, longitude: pickupLongitude },
    center
  );

  return distanceKm <= zone.serviceRadiusKm;
}

function extractLikelyCity(location: string) {
  const parts = normalizeOperationalZoneText(location).split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  return parts.slice(-3).join(' ');
}

function getCityCenterCoordinates(city: string) {
  const center = CITY_CENTER_COORDINATES[normalizeOperationalZoneText(city)];
  return center ?? null;
}

function calculateDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const earthRadiusKm = 6371;
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function vehicleTypeLabel(type: OperationalVehicleType) {
  if (type === 'SUV') return 'SUV';
  if (type === 'PREMIUM') return 'Premium';
  return 'Sedan';
}

const CITY_CENTER_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  jalandhar: { latitude: 31.326, longitude: 75.5762 },
  amritsar: { latitude: 31.634, longitude: 74.8723 },
  ludhiana: { latitude: 30.901, longitude: 75.8573 },
  chandigarh: { latitude: 30.7333, longitude: 76.7794 },
  delhi: { latitude: 28.6139, longitude: 77.209 },
  pathankot: { latitude: 32.2733, longitude: 75.6522 },
  mohali: { latitude: 30.7046, longitude: 76.7179 },
  zirakpur: { latitude: 30.6425, longitude: 76.8173 },
  phagwara: { latitude: 31.224, longitude: 75.7708 },
};
