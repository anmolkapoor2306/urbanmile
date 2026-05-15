export const OPERATIONAL_ZONE_STATUSES = ['ENABLED', 'LIMITED', 'DISABLED'] as const;
export const OPERATIONAL_VEHICLE_TYPES = ['SEDAN', 'SUV', 'PREMIUM'] as const;
export const PICKUP_UNSERVICEABLE_MESSAGE = 'Pickup area is not serviceable yet.';
export const DROPOFF_UNSERVICEABLE_MESSAGE = 'Drop-off area is not serviceable yet.';
export const ROUTE_MANUAL_CONFIRMATION_MESSAGE = 'This route requires manual confirmation.';
export const PICKUP_MANUAL_CONFIRMATION_MESSAGE = ROUTE_MANUAL_CONFIRMATION_MESSAGE;

export type OperationalZoneStatus = (typeof OPERATIONAL_ZONE_STATUSES)[number];
export type OperationalVehicleType = (typeof OPERATIONAL_VEHICLE_TYPES)[number];

export type SerializedOperationalZone = {
  id: string;
  city: string;
  centerLat: number | null;
  centerLng: number | null;
  status: OperationalZoneStatus;
  airportEnabled: boolean;
  outstationEnabled: boolean;
  autoDispatchEnabled: boolean;
  enabledVehicleTypes: OperationalVehicleType[];
  serviceRadiusKm: number;
  createdAt: string;
  updatedAt: string;
};

export type SerializedServiceControlConfig = {
  allowIndiaWideBooking: boolean;
};

export type OperationalZoneBookingInput = {
  pickupLocation: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropoffLocation?: string | null;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  carType?: string | null;
  bookingMode?: string | null;
};

export type OperationalZoneValidationResult =
  | {
      ok: true;
      zone: SerializedOperationalZone | null;
      pickupZone: SerializedOperationalZone | null;
      dropoffZone: SerializedOperationalZone | null;
      confirmation: 'instant' | 'manual';
      code: string | null;
      message: string | null;
    }
  | {
      ok: false;
      zone: SerializedOperationalZone | null;
      pickupZone: SerializedOperationalZone | null;
      dropoffZone: SerializedOperationalZone | null;
      code: string;
      message: string;
    };

export type PickupServiceabilityResult =
  | {
      serviceable: true;
      confirmation: 'instant';
      zone: null;
      code: 'INDIA_WIDE_ENABLED';
      message: null;
    }
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
      message: typeof ROUTE_MANUAL_CONFIRMATION_MESSAGE;
    }
  | {
      serviceable: false;
      locationType: 'pickup' | 'dropoff';
      confirmation: 'blocked';
      zone: SerializedOperationalZone | null;
      code: string;
      message: typeof PICKUP_UNSERVICEABLE_MESSAGE | typeof DROPOFF_UNSERVICEABLE_MESSAGE;
    };

type ServicePointResult =
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
      message: typeof ROUTE_MANUAL_CONFIRMATION_MESSAGE;
    }
  | Extract<PickupServiceabilityResult, { serviceable: false }>;

type ServiceUnavailableResult = Extract<PickupServiceabilityResult, { serviceable: false }>;

export type RouteServiceabilityResult =
  | {
      ok: true;
      confirmation: 'instant';
      pickupZone: SerializedOperationalZone | null;
      dropoffZone: SerializedOperationalZone | null;
      code: 'ROUTE_INSTANT';
      message: null;
    }
  | {
      ok: true;
      confirmation: 'manual';
      pickupZone: SerializedOperationalZone | null;
      dropoffZone: SerializedOperationalZone | null;
      code: 'ROUTE_MANUAL';
      message: typeof ROUTE_MANUAL_CONFIRMATION_MESSAGE;
    }
  | {
      ok: false;
      locationType: 'pickup' | 'dropoff';
      confirmation: 'blocked';
      pickupZone: SerializedOperationalZone | null;
      dropoffZone: SerializedOperationalZone | null;
      code: string;
      message: typeof PICKUP_UNSERVICEABLE_MESSAGE | typeof DROPOFF_UNSERVICEABLE_MESSAGE;
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
  pickupLocation: string,
  pickupLatitude?: number | null,
  pickupLongitude?: number | null
): SerializedOperationalZone | null {
  if (
    typeof pickupLatitude === 'number' &&
    Number.isFinite(pickupLatitude) &&
    typeof pickupLongitude === 'number' &&
    Number.isFinite(pickupLongitude)
  ) {
    let comparableZoneCount = 0;
    const coordinateMatches = zones
      .map((zone) => {
        const center =
          typeof zone.centerLat === 'number' && typeof zone.centerLng === 'number'
            ? { latitude: zone.centerLat, longitude: zone.centerLng }
            : getCityCenterCoordinates(zone.city);
        if (!center) return null;
        comparableZoneCount += 1;
        const distanceKm = calculateDistanceKm(
          { latitude: pickupLatitude, longitude: pickupLongitude },
          center
        );
        return distanceKm <= zone.serviceRadiusKm ? { zone, distanceKm } : null;
      })
      .filter((match): match is { zone: SerializedOperationalZone; distanceKm: number } => Boolean(match))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    if (coordinateMatches[0]) {
      return coordinateMatches[0].zone;
    }

    if (comparableZoneCount > 0) {
      return null;
    }
  }

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
  const serviceability = isRouteServiceable(zones, input);

  if (!serviceability.ok) {
    return {
      ok: false,
      zone: serviceability.pickupZone,
      pickupZone: serviceability.pickupZone,
      dropoffZone: serviceability.dropoffZone,
      code: serviceability.code,
      message: serviceability.message,
    };
  }

  return {
    ok: true,
    zone: serviceability.pickupZone,
    pickupZone: serviceability.pickupZone,
    dropoffZone: serviceability.dropoffZone,
    confirmation: serviceability.confirmation,
    code: serviceability.code,
    message: serviceability.message,
  };
}

export function isBookingDispatchableByZone(
  zones: SerializedOperationalZone[],
  booking: Pick<OperationalZoneBookingInput, 'pickupLocation' | 'pickupLatitude' | 'pickupLongitude' | 'dropoffLocation' | 'dropoffLatitude' | 'dropoffLongitude' | 'carType'> & { confirmedAt?: Date | string | null },
  config?: SerializedServiceControlConfig
) {
  if (booking.confirmedAt === null) {
    return false;
  }

  if (config?.allowIndiaWideBooking) {
    return true;
  }

  const serviceability = isRouteServiceable(zones, {
    pickupLocation: booking.pickupLocation,
    pickupLatitude: booking.pickupLatitude,
    pickupLongitude: booking.pickupLongitude,
    dropoffLocation: booking.dropoffLocation,
    dropoffLatitude: booking.dropoffLatitude,
    dropoffLongitude: booking.dropoffLongitude,
    carType: booking.carType,
    bookingMode: 'ONE_WAY',
  });

  return serviceability.ok &&
    serviceability.confirmation === 'instant' &&
    Boolean(serviceability.pickupZone?.autoDispatchEnabled) &&
    Boolean(serviceability.dropoffZone?.autoDispatchEnabled);
}

export function isRouteServiceable(
  zones: SerializedOperationalZone[],
  input: OperationalZoneBookingInput,
  config?: SerializedServiceControlConfig
): RouteServiceabilityResult {
  if (config?.allowIndiaWideBooking) {
    return {
      ok: true,
      confirmation: 'instant',
      pickupZone: null,
      dropoffZone: null,
      code: 'ROUTE_INSTANT',
      message: null,
    };
  }

  const pickup = evaluateServicePoint(zones, input, 'pickup');
  if (!pickup.serviceable) {
    return {
      ok: false,
      locationType: 'pickup',
      confirmation: 'blocked',
      pickupZone: pickup.zone,
      dropoffZone: null,
      code: pickup.code,
      message: pickup.message,
    };
  }

  const dropoff = evaluateServicePoint(zones, input, 'dropoff');
  if (!dropoff.serviceable) {
    return {
      ok: false,
      locationType: 'dropoff',
      confirmation: 'blocked',
      pickupZone: pickup.zone,
      dropoffZone: dropoff.zone,
      code: dropoff.code,
      message: dropoff.message,
    };
  }

  if (pickup.zone.status === 'LIMITED' || dropoff.zone.status === 'LIMITED') {
    return {
      ok: true,
      confirmation: 'manual',
      pickupZone: pickup.zone,
      dropoffZone: dropoff.zone,
      code: 'ROUTE_MANUAL',
      message: ROUTE_MANUAL_CONFIRMATION_MESSAGE,
    };
  }

  return {
    ok: true,
    confirmation: 'instant',
    pickupZone: pickup.zone,
    dropoffZone: dropoff.zone,
    code: 'ROUTE_INSTANT',
    message: null,
  };
}

export function isPickupServiceable(
  zones: SerializedOperationalZone[],
  pickupAddress: string,
  pickupLat?: number | null,
  pickupLng?: number | null,
  vehicleType?: string | null,
  rideType?: string | null,
  dropoffAddress?: string | null,
  config?: SerializedServiceControlConfig
): PickupServiceabilityResult {
  if (config?.allowIndiaWideBooking) {
    return {
      serviceable: true,
      confirmation: 'instant',
      zone: null,
      code: 'INDIA_WIDE_ENABLED',
      message: null,
    };
  }

  const input: OperationalZoneBookingInput = {
    pickupLocation: pickupAddress,
    pickupLatitude: pickupLat,
    pickupLongitude: pickupLng,
    carType: vehicleType,
    bookingMode: rideType,
    dropoffLocation: dropoffAddress,
  };
  const zone = findMatchingOperationalZone(zones, pickupAddress, pickupLat, pickupLng);

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
      message: ROUTE_MANUAL_CONFIRMATION_MESSAGE,
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

function evaluateServicePoint(
  zones: SerializedOperationalZone[],
  input: OperationalZoneBookingInput,
  locationType: 'pickup' | 'dropoff'
): ServicePointResult {
  const isPickup = locationType === 'pickup';
  const location = isPickup ? input.pickupLocation : input.dropoffLocation ?? '';
  const latitude = isPickup ? input.pickupLatitude : input.dropoffLatitude;
  const longitude = isPickup ? input.pickupLongitude : input.dropoffLongitude;
  const zone = findMatchingOperationalZone(zones, location, latitude, longitude);

  if (!zone) {
    return serviceUnavailable(null, `${locationType.toUpperCase()}_ZONE_UNSUPPORTED`, locationType);
  }

  if (zone.status === 'DISABLED') {
    return serviceUnavailable(zone, `${locationType.toUpperCase()}_ZONE_DISABLED`, locationType);
  }

  if (!isLocationWithinServiceRadius(zone, latitude, longitude)) {
    return serviceUnavailable(zone, `${locationType.toUpperCase()}_ZONE_RADIUS_EXCEEDED`, locationType);
  }

  const mappedVehicleType = mapCarTypeToOperationalVehicleType(input.carType);
  if (!zone.enabledVehicleTypes.includes(mappedVehicleType)) {
    return serviceUnavailable(zone, `${locationType.toUpperCase()}_VEHICLE_TYPE_UNSUPPORTED`, locationType);
  }

  if (isAirportRide(input) && !zone.airportEnabled) {
    return serviceUnavailable(zone, `${locationType.toUpperCase()}_AIRPORT_UNSUPPORTED`, locationType);
  }

  const otherZone = findMatchingOperationalZone(
    zones,
    isPickup ? input.dropoffLocation ?? '' : input.pickupLocation,
    isPickup ? input.dropoffLatitude : input.pickupLatitude,
    isPickup ? input.dropoffLongitude : input.pickupLongitude
  );
  const rideIsOutstation = otherZone
    ? normalizeOperationalZoneText(otherZone.city) !== normalizeOperationalZoneText(zone.city)
    : isOutstationRide(input);

  if (rideIsOutstation && !zone.outstationEnabled) {
    return serviceUnavailable(zone, `${locationType.toUpperCase()}_OUTSTATION_UNSUPPORTED`, locationType);
  }

  if (zone.status === 'LIMITED') {
    return {
      serviceable: true,
      confirmation: 'manual',
      zone,
      code: 'ZONE_LIMITED',
      message: ROUTE_MANUAL_CONFIRMATION_MESSAGE,
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

function serviceUnavailable(zone: SerializedOperationalZone | null, code: string, locationType: 'pickup' | 'dropoff' = 'pickup'): ServiceUnavailableResult {
  return {
    serviceable: false,
    locationType,
    confirmation: 'blocked',
    zone,
    code,
    message: locationType === 'pickup' ? PICKUP_UNSERVICEABLE_MESSAGE : DROPOFF_UNSERVICEABLE_MESSAGE,
  };
}

export function isPickupWithinServiceRadius(zone: SerializedOperationalZone, input: OperationalZoneBookingInput) {
  return isLocationWithinServiceRadius(zone, input.pickupLatitude, input.pickupLongitude);
}

export function isLocationWithinServiceRadius(
  zone: SerializedOperationalZone,
  latitude?: number | null,
  longitude?: number | null
) {
  if (
    typeof latitude !== 'number' ||
    !Number.isFinite(latitude) ||
    typeof longitude !== 'number' ||
    !Number.isFinite(longitude)
  ) {
    return true;
  }

  const center =
    typeof zone.centerLat === 'number' && typeof zone.centerLng === 'number'
      ? { latitude: zone.centerLat, longitude: zone.centerLng }
      : getCityCenterCoordinates(zone.city);
  if (!center) return true;

  const distanceKm = calculateDistanceKm(
    { latitude, longitude },
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
