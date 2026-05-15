import { Prisma } from '@prisma/client';

export const driverRecordSelect = {
  id: true,
  driverCode: true,
  name: true,
  fullName: true,
  phone: true,
  email: true,
  status: true,
  dutyStatus: true,
  vehicleType: true,
  vehicleNumber: true,
  isActive: true,
  driverType: true,
  availabilityStatus: true,
  licenseInfo: true,
  notes: true,
  vendorId: true,
  lastLoginAt: true,
  vendor: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.DriverSelect;

export type DriverRecord = Prisma.DriverGetPayload<{
  select: typeof driverRecordSelect;
}>;

export type SerializedDriver = ReturnType<typeof serializeDriver>;

export function serializeDriver(driver: DriverRecord) {
  return {
    id: driver.id,
    driverCode: driver.driverCode,
    fullName: driver.fullName || driver.name,
    name: driver.fullName || driver.name,
    phone: driver.phone,
    email: driver.email,
    status: driver.status,
    dutyStatus: driver.dutyStatus,
    vehicleType: driver.vehicleType,
    vehicleNumber: driver.vehicleNumber,
    isActive: driver.status === 'ACTIVE' && driver.isActive,
    driverType: driver.driverType,
    availabilityStatus: driver.availabilityStatus,
    licenseInfo: driver.licenseInfo,
    notes: driver.notes,
    vendorId: driver.vendorId,
    lastLoginAt: driver.lastLoginAt?.toISOString() ?? null,
    vendor: driver.vendor,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString(),
  };
}
