import type { Prisma, PrismaClient } from '@prisma/client';
import {
  isPickupServiceable as isPickupServiceableFromZones,
  isRouteServiceable as isRouteServiceableFromZones,
  validateOperationalZoneForBooking,
  type OperationalZoneBookingInput,
  type SerializedServiceControlConfig,
  type SerializedOperationalZone,
} from '@/lib/operationalZoneRules';

type OperationalZoneRecord = {
  id: string;
  city: string;
  centerLat: number | null;
  centerLng: number | null;
  status: string;
  airportEnabled: boolean;
  outstationEnabled: boolean;
  autoDispatchEnabled: boolean;
  enabledVehicleTypes: string[];
  serviceRadiusKm: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type OperationalZoneClient = Pick<PrismaClient, 'serviceArea' | 'serviceControlConfig' | '$queryRawUnsafe'> | Prisma.TransactionClient;

export const operationalZoneSelect = {
  id: true,
  city: true,
  centerLat: true,
  centerLng: true,
  status: true,
  serviceRadiusKm: true,
  airportEnabled: true,
  outstationEnabled: true,
  autoDispatchEnabled: true,
  enabledVehicleTypes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ServiceAreaSelect;

export function serializeOperationalZone(zone: OperationalZoneRecord): SerializedOperationalZone {
  return {
    id: zone.id,
    city: zone.city,
    centerLat: zone.centerLat,
    centerLng: zone.centerLng,
    status: zone.status as SerializedOperationalZone['status'],
    airportEnabled: zone.airportEnabled,
    outstationEnabled: zone.outstationEnabled,
    autoDispatchEnabled: zone.autoDispatchEnabled,
    enabledVehicleTypes: zone.enabledVehicleTypes as SerializedOperationalZone['enabledVehicleTypes'],
    serviceRadiusKm: zone.serviceRadiusKm,
    createdAt: toIsoDate(zone.createdAt),
    updatedAt: toIsoDate(zone.updatedAt),
  };
}

export async function getOperationalZones(client: OperationalZoneClient) {
  if (!client.serviceArea) {
    const zones = await getOperationalZonesWithRawSql(client);

    return zones.map(serializeOperationalZone);
  }

  const zones = await client.serviceArea.findMany({
    select: operationalZoneSelect,
    orderBy: [{ city: 'asc' }],
  });

  return zones.map(serializeOperationalZone);
}

export async function assertOperationalZoneSupportsBooking(
  client: OperationalZoneClient,
  input: OperationalZoneBookingInput
) {
  const zones = await getOperationalZones(client);
  const config = await getServiceControlConfig(client);
  if (config.allowIndiaWideBooking) {
    return {
      ok: true,
      zone: null,
      pickupZone: null,
      dropoffZone: null,
      confirmation: 'instant',
      code: 'INDIA_WIDE_ENABLED',
      message: null,
    } as const;
  }
  return validateOperationalZoneForBooking(zones, input);
}

export async function getServiceControlConfig(client: OperationalZoneClient): Promise<SerializedServiceControlConfig> {
  if (!client.serviceControlConfig) {
    const records = await client.$queryRawUnsafe<{ allowIndiaWideBooking: boolean }[]>(
      `SELECT "allow_india_wide_booking" AS "allowIndiaWideBooking"
       FROM "ServiceControlConfig"
       WHERE "singleton_key" = 'default'
       LIMIT 1`
    );

    return { allowIndiaWideBooking: Boolean(records[0]?.allowIndiaWideBooking) };
  }

  const config = await client.serviceControlConfig.upsert({
    where: { singletonKey: 'default' },
    update: {},
    create: { singletonKey: 'default' },
    select: { allowIndiaWideBooking: true },
  });

  return { allowIndiaWideBooking: config.allowIndiaWideBooking };
}

export async function isPickupServiceable(
  client: OperationalZoneClient,
  pickupAddress: string,
  pickupLat?: number | null,
  pickupLng?: number | null,
  vehicleType?: string | null,
  rideType?: string | null,
  dropoffAddress?: string | null
) {
  const zones = await getOperationalZones(client);
  const config = await getServiceControlConfig(client);
  return isPickupServiceableFromZones(zones, pickupAddress, pickupLat, pickupLng, vehicleType, rideType, dropoffAddress, config);
}

export async function isRouteServiceable(
  client: OperationalZoneClient,
  input: OperationalZoneBookingInput
) {
  const zones = await getOperationalZones(client);
  const config = await getServiceControlConfig(client);
  return isRouteServiceableFromZones(zones, input, config);
}

async function getOperationalZonesWithRawSql(client: OperationalZoneClient) {
  const columns = await client.$queryRawUnsafe<{ column_name: string }[]>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = current_schema()
       AND table_name = 'ServiceArea'`
  );
  const columnNames = new Set(columns.map((column) => column.column_name));

  const serviceRadiusColumn = columnNames.has('service_radius_km') ? '"service_radius_km"' : '"maxRadiusKm"';
  const airportColumn = columnNames.has('airport_enabled') ? '"airport_enabled"' : '"airportEnabled"';
  const outstationColumn = columnNames.has('outstation_enabled') ? '"outstation_enabled"' : '"outstationEnabled"';
  const autoDispatchColumn = columnNames.has('auto_dispatch_enabled') ? '"auto_dispatch_enabled"' : '"autoDispatchEnabled"';
  const vehicleTypesColumn = columnNames.has('enabled_vehicle_types') ? '"enabled_vehicle_types"' : '"enabledVehicleTypes"';
  const createdAtColumn = columnNames.has('created_at') ? '"created_at"' : '"createdAt"';
  const updatedAtColumn = columnNames.has('updated_at') ? '"updated_at"' : '"updatedAt"';

  return client.$queryRawUnsafe<OperationalZoneRecord[]>(
    `SELECT
       "id",
       "city",
       "center_lat" AS "centerLat",
       "center_lng" AS "centerLng",
       "status",
       ${airportColumn} AS "airportEnabled",
       ${outstationColumn} AS "outstationEnabled",
       ${autoDispatchColumn} AS "autoDispatchEnabled",
       ${vehicleTypesColumn} AS "enabledVehicleTypes",
       ${serviceRadiusColumn} AS "serviceRadiusKm",
       ${createdAtColumn} AS "createdAt",
       ${updatedAtColumn} AS "updatedAt"
     FROM "ServiceArea"
     ORDER BY "city" ASC`
  );
}

function toIsoDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
