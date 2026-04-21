import { Prisma } from '@prisma/client';

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
  archivedAt: true,
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
} satisfies Prisma.BookingSelect;

export type BookingRecord = Prisma.BookingGetPayload<{
  select: typeof bookingRecordSelect;
}>;

export type SerializedBooking = ReturnType<typeof serializeBooking>;

export function createBookingReference(id: string, createdAt: Date | string): string {
  const createdAtDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return `UM-${createdAtDate.toISOString().slice(0, 10).replace(/-/g, '')}-${id.slice(0, 8)}`;
}

function serializeMoney(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value);
}

export function serializeBooking(booking: BookingRecord) {
  return {
    id: booking.id,
    bookingReference: booking.bookingReference,
    bookingType: booking.bookingType,
    fullName: booking.fullName,
    email: booking.email,
    phone: booking.phone,
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
    archivedAt: booking.archivedAt?.toISOString() ?? null,
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
