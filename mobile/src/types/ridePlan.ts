export type RidePoint = {
  label: string;
  latitude: number | null;
  longitude: number | null;
};

export type RideField = 'pickup' | 'dropoff';

export type RidePlanParams = {
  pickupLabel?: string;
  pickupLat?: string;
  pickupLng?: string;
  dropoffLabel?: string;
  dropoffLat?: string;
  dropoffLng?: string;
  centerLat?: string;
  centerLng?: string;
};

export function pointFromParams(
  params: RidePlanParams,
  field: RideField,
  fallback: RidePoint
): RidePoint {
  const label = getParamString(params[`${field}Label`]) || fallback.label;
  const latitude = getParamNumber(params[`${field}Lat`]);
  const longitude = getParamNumber(params[`${field}Lng`]);

  return {
    label,
    latitude: latitude ?? fallback.latitude,
    longitude: longitude ?? fallback.longitude,
  };
}

export function serializeRidePlan(pickup: RidePoint, dropoff: RidePoint, extra: Record<string, string> = {}) {
  return {
    pickupLabel: pickup.label,
    pickupLat: coordinateToParam(pickup.latitude),
    pickupLng: coordinateToParam(pickup.longitude),
    dropoffLabel: dropoff.label,
    dropoffLat: coordinateToParam(dropoff.latitude),
    dropoffLng: coordinateToParam(dropoff.longitude),
    ...extra,
  };
}

export function hasCompletePoint(point: RidePoint) {
  return Boolean(point.label.trim()) && point.latitude !== null && point.longitude !== null;
}

function coordinateToParam(value: number | null) {
  return value === null ? '' : String(value);
}

function getParamString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getParamNumber(value: string | string[] | undefined) {
  const text = getParamString(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}
