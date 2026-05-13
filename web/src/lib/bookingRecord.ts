import { Prisma, type PrismaClient } from '@prisma/client';

export const bookingRecordSelect = {
  id: true,
  bookingReference: true,
  bookingType: true,
  fullName: true,
  email: true,
  phone: true,
  pickupLocation: true,
  pickupLatitude: true,
  pickupLongitude: true,
  pickupPlaceId: true,
  pickupLocationSource: true,
  dropoffLocation: true,
  dropoffLatitude: true,
  dropoffLongitude: true,
  dropoffPlaceId: true,
  dropoffLocationSource: true,
  pickupDateTime: true,
  carType: true,
  specialInstructions: true,
  internalNotes: true,
  status: true,
  paymentStatus: true,
  assignmentType: true,
  driverId: true,
  vendorId: true,
  vehicleId: true,
  assignedAt: true,
  confirmedAt: true,
  startedAt: true,
  completedAt: true,
  cancelledAt: true,
  cancelReason: true,
  fareAmount: true,
  commissionAmount: true,
  payoutAmount: true,
  netEarningAmount: true,
  driverEarning: true,
  paymentReceivedAt: true,
  manualVendorName: true,
  manualDriverName: true,
  manualDriverPhone: true,
  manualVehicleDetails: true,
  createdAt: true,
  updatedAt: true,
  driver: {
    select: {
      id: true,
      name: true,
      phone: true,
      isActive: true,
      driverType: true,
      availabilityStatus: true,
      email: true,
    },
  },
  vendor: {
    select: {
      id: true,
      name: true,
      phone: true,
      contactPerson: true,
    },
  },
  vehicle: {
    select: {
      id: true,
      plateNumber: true,
      model: true,
      vehicleType: true,
      ownershipType: true,
      status: true,
    },
  },
  customer: {
    select: {
      publicId: true,
      name: true,
      phone: true,
      email: true,
    },
  },
} satisfies Prisma.BookingSelect;

export type BookingRecord = Prisma.BookingGetPayload<{
  select: typeof bookingRecordSelect;
}>;

export type SerializedBooking = ReturnType<typeof serializeBooking>;

type BookingReadClient = Pick<PrismaClient, 'booking' | '$queryRawUnsafe'> | Prisma.TransactionClient;

export async function findBookingRecords(
  client: BookingReadClient,
  options: {
    activeOnly?: boolean;
    take?: number;
  } = {}
): Promise<BookingRecord[]> {
  const take = options.take ?? 1000;

  try {
    return await client.booking.findMany({
      where: options.activeOnly ? { status: { notIn: ['COMPLETE', 'CANCELLED'] } } : undefined,
      select: bookingRecordSelect,
      orderBy: [{ pickupDateTime: 'asc' }, { createdAt: 'desc' }],
      take,
    });
  } catch (error) {
    console.warn('Prisma booking.findMany failed; falling back to raw booking read:', error instanceof Error ? error.message : error);
    return findBookingRecordsRaw(client, { activeOnly: options.activeOnly, take });
  }
}

export function createBookingReference(id: string, createdAt: Date | string): string {
  const createdAtDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return `UM-${createdAtDate.toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(0, 8)}`;
}

function serializeMoney(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

type RawBookingRecord = {
  id: string;
  bookingReference: string;
  bookingType: string;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  pickupPlaceId: string | null;
  pickupLocationSource: string | null;
  dropoffLocation: string;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
  dropoffPlaceId: string | null;
  dropoffLocationSource: string | null;
  pickupDateTime: Date;
  carType: string;
  specialInstructions: string | null;
  internalNotes: string | null;
  status: string;
  paymentStatus: string;
  assignmentType: string | null;
  driverId: string | null;
  vendorId: string | null;
  vehicleId: string | null;
  assignedAt: Date | null;
  confirmedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  fareAmount: Prisma.Decimal | null;
  commissionAmount: Prisma.Decimal | null;
  payoutAmount: Prisma.Decimal | null;
  netEarningAmount: Prisma.Decimal | null;
  driverEarning: Prisma.Decimal | null;
  paymentReceivedAt: Date | null;
  manualVendorName: string | null;
  manualDriverName: string | null;
  manualDriverPhone: string | null;
  manualVehicleDetails: string | null;
  createdAt: Date;
  updatedAt: Date;
  driverName: string | null;
  driverPhone: string | null;
  driverIsActive: boolean | null;
  driverType: string | null;
  driverAvailabilityStatus: string | null;
  driverEmail: string | null;
  vendorName: string | null;
  vendorPhone: string | null;
  vendorContactPerson: string | null;
  vehiclePlateNumber: string | null;
  vehicleModel: string | null;
  vehicleType: string | null;
  vehicleOwnershipType: string | null;
  vehicleStatus: string | null;
  customerPublicId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
};

async function findBookingRecordsRaw(
  client: BookingReadClient,
  options: {
    activeOnly?: boolean;
    take: number;
  }
): Promise<BookingRecord[]> {
  const activeWhere = options.activeOnly
    ? `WHERE b."status"::text NOT IN ('COMPLETE', 'COMPLETED', 'CANCELLED')`
    : '';
  const rows = await client.$queryRawUnsafe<RawBookingRecord[]>(
    `
      SELECT
        b."id",
        b."bookingReference",
        b."bookingType"::text AS "bookingType",
        b."fullName",
        b."email",
        b."phone",
        b."pickupLocation",
        b."pickupLatitude",
        b."pickupLongitude",
        b."pickupPlaceId",
        b."pickupLocationSource"::text AS "pickupLocationSource",
        b."dropoffLocation",
        b."dropoffLatitude",
        b."dropoffLongitude",
        b."dropoffPlaceId",
        b."dropoffLocationSource"::text AS "dropoffLocationSource",
        b."pickupDateTime",
        b."carType"::text AS "carType",
        b."specialInstructions",
        b."internalNotes",
        b."status"::text AS "status",
        b."paymentStatus"::text AS "paymentStatus",
        b."assignmentType"::text AS "assignmentType",
        b."driverId",
        b."vendorId",
        b."vehicleId",
        b."assignedAt",
        b."confirmedAt",
        b."startedAt",
        b."completedAt",
        b."cancelledAt",
        b."cancelReason",
        b."fareAmount",
        b."commissionAmount",
        b."payoutAmount",
        b."netEarningAmount",
        b."driverEarning",
        b."paymentReceivedAt",
        b."manualVendorName",
        b."manualDriverName",
        b."manualDriverPhone",
        b."manualVehicleDetails",
        b."createdAt",
        b."updatedAt",
        d."name" AS "driverName",
        d."phone" AS "driverPhone",
        d."isActive" AS "driverIsActive",
        d."driverType"::text AS "driverType",
        d."availabilityStatus"::text AS "driverAvailabilityStatus",
        d."email" AS "driverEmail",
        vnd."name" AS "vendorName",
        vnd."phone" AS "vendorPhone",
        vnd."contactPerson" AS "vendorContactPerson",
        veh."plateNumber" AS "vehiclePlateNumber",
        veh."model" AS "vehicleModel",
        veh."vehicleType"::text AS "vehicleType",
        veh."ownershipType"::text AS "vehicleOwnershipType",
        veh."status"::text AS "vehicleStatus",
        c."publicId" AS "customerPublicId",
        c."name" AS "customerName",
        c."phone" AS "customerPhone",
        c."email" AS "customerEmail"
      FROM "Booking" b
      LEFT JOIN "Driver" d ON d."id" = b."driverId"
      LEFT JOIN "Vendor" vnd ON vnd."id" = b."vendorId"
      LEFT JOIN "Vehicle" veh ON veh."id" = b."vehicleId"
      LEFT JOIN "Customer" c ON c."id" = b."customerId"
      ${activeWhere}
      ORDER BY b."pickupDateTime" ASC, b."createdAt" DESC
      LIMIT $1
    `,
    options.take
  );

  return rows.map((row) => ({
    id: row.id,
    bookingReference: row.bookingReference,
    bookingType: row.bookingType,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    pickupLocation: row.pickupLocation,
    pickupLatitude: row.pickupLatitude,
    pickupLongitude: row.pickupLongitude,
    pickupPlaceId: row.pickupPlaceId,
    pickupLocationSource: row.pickupLocationSource,
    dropoffLocation: row.dropoffLocation,
    dropoffLatitude: row.dropoffLatitude,
    dropoffLongitude: row.dropoffLongitude,
    dropoffPlaceId: row.dropoffPlaceId,
    dropoffLocationSource: row.dropoffLocationSource,
    pickupDateTime: row.pickupDateTime,
    carType: row.carType,
    specialInstructions: row.specialInstructions,
    internalNotes: row.internalNotes,
    status: normalizeBookingStatus(row.status),
    paymentStatus: row.paymentStatus,
    assignmentType: row.assignmentType,
    driverId: row.driverId,
    vendorId: row.vendorId,
    vehicleId: row.vehicleId,
    assignedAt: row.assignedAt,
    confirmedAt: row.confirmedAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    cancelReason: row.cancelReason,
    fareAmount: row.fareAmount,
    commissionAmount: row.commissionAmount,
    payoutAmount: row.payoutAmount,
    netEarningAmount: row.netEarningAmount,
    driverEarning: row.driverEarning,
    paymentReceivedAt: row.paymentReceivedAt,
    manualVendorName: row.manualVendorName,
    manualDriverName: row.manualDriverName,
    manualDriverPhone: row.manualDriverPhone,
    manualVehicleDetails: row.manualVehicleDetails,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    driver: row.driverId
      ? {
          id: row.driverId,
          name: row.driverName ?? '',
          phone: row.driverPhone ?? '',
          isActive: row.driverIsActive ?? false,
          driverType: row.driverType ?? 'THIRD_PARTY',
          availabilityStatus: row.driverAvailabilityStatus ?? 'OFFLINE',
          email: row.driverEmail,
        }
      : null,
    vendor: row.vendorId
      ? {
          id: row.vendorId,
          name: row.vendorName ?? '',
          phone: row.vendorPhone ?? '',
          contactPerson: row.vendorContactPerson,
        }
      : null,
    vehicle: row.vehicleId
      ? {
          id: row.vehicleId,
          plateNumber: row.vehiclePlateNumber ?? '',
          model: row.vehicleModel ?? '',
          vehicleType: row.vehicleType ?? 'SEDAN',
          ownershipType: row.vehicleOwnershipType ?? 'THIRD_PARTY',
          status: row.vehicleStatus ?? 'ACTIVE',
        }
      : null,
    customer: row.customerPublicId
      ? {
          publicId: row.customerPublicId,
          name: row.customerName ?? row.fullName,
          phone: row.customerPhone,
          email: row.customerEmail,
        }
      : null,
  })) as BookingRecord[];
}

function normalizeBookingStatus(status: string) {
  if (status === 'NEW' || status === 'CONFIRMED' || status === 'LEGACY_NEW' || status === 'legacy_new') {
    return 'NEEDS_ASSIGNMENT';
  }
  if (status === 'COMPLETED') return 'COMPLETE';
  return status;
}

export function serializeBooking(booking: BookingRecord) {
  const optionalBooking = booking as BookingRecord & {
    publicBookingId?: string | null;
    roundTripGroupId?: string | null;
    parentPublicBookingId?: string | null;
    customer?: {
      publicId: string;
      name: string;
      phone: string;
      email: string | null;
    } | null;
  };

  return {
    id: booking.id,
    publicBookingId: optionalBooking.publicBookingId ?? undefined,
    bookingReference: optionalBooking.publicBookingId || booking.bookingReference,
    internalBookingReference: booking.bookingReference,
    roundTripGroupId: optionalBooking.roundTripGroupId ?? null,
    parentPublicBookingId: optionalBooking.parentPublicBookingId ?? null,
    bookingType: booking.bookingType,
    fullName: optionalBooking.customer?.name || booking.fullName,
    email: booking.email,
    phone: optionalBooking.customer?.phone || booking.phone,
    customerPublicId: optionalBooking.customer?.publicId ?? null,
    customerName: optionalBooking.customer?.name ?? booking.fullName,
    customerPhone: optionalBooking.customer?.phone ?? booking.phone,
    customerEmail: optionalBooking.customer?.email ?? booking.email,
    pickupLocation: booking.pickupLocation,
    pickupLatitude: booking.pickupLatitude,
    pickupLongitude: booking.pickupLongitude,
    pickupPlaceId: booking.pickupPlaceId,
    pickupLocationSource: booking.pickupLocationSource,
    dropoffLocation: booking.dropoffLocation,
    dropoffLatitude: booking.dropoffLatitude,
    dropoffLongitude: booking.dropoffLongitude,
    dropoffPlaceId: booking.dropoffPlaceId,
    dropoffLocationSource: booking.dropoffLocationSource,
    pickupDateTime: booking.pickupDateTime.toISOString(),
    carType: booking.carType,
    specialInstructions: booking.specialInstructions,
    internalNotes: booking.internalNotes,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    assignmentType: booking.assignmentType,
    driverId: booking.driverId,
    vendorId: booking.vendorId,
    vehicleId: booking.vehicleId,
    assignedAt: booking.assignedAt?.toISOString() ?? null,
    confirmedAt: booking.confirmedAt?.toISOString() ?? null,
    startedAt: booking.startedAt?.toISOString() ?? null,
    completedAt: booking.completedAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    cancelReason: booking.cancelReason,
    fareAmount: serializeMoney(booking.fareAmount),
    commissionAmount: serializeMoney(booking.commissionAmount),
    payoutAmount: serializeMoney(booking.payoutAmount),
    netEarningAmount: serializeMoney(booking.netEarningAmount),
    driverEarning: serializeMoney(booking.driverEarning),
    paymentReceivedAt: booking.paymentReceivedAt?.toISOString() ?? null,
    manualVendorName: booking.manualVendorName,
    manualDriverName: booking.manualDriverName,
    manualDriverPhone: booking.manualDriverPhone,
    manualVehicleDetails: booking.manualVehicleDetails,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    driver: booking.driver
      ? {
          id: booking.driver.id,
          name: booking.driver.name,
          phone: booking.driver.phone,
          isActive: booking.driver.isActive,
          driverType: booking.driver.driverType,
          availabilityStatus: booking.driver.availabilityStatus,
          email: booking.driver.email,
        }
      : null,
    vendor: booking.vendor
      ? {
          id: booking.vendor.id,
          name: booking.vendor.name,
          phone: booking.vendor.phone,
          contactPerson: booking.vendor.contactPerson,
        }
      : null,
    vehicle: booking.vehicle
      ? {
          id: booking.vehicle.id,
          plateNumber: booking.vehicle.plateNumber,
          model: booking.vehicle.model,
          vehicleType: booking.vehicle.vehicleType,
          ownershipType: booking.vehicle.ownershipType,
          status: booking.vehicle.status,
        }
      : null,
  };
}
