import { Prisma } from '@prisma/client';

export const driverRecordSelect = {
  id: true,
  driverCode: true,
  name: true,
  phone: true,
  email: true,
  vehicleType: true,
  vehicleNumber: true,
  isActive: true,
  driverType: true,
  availabilityStatus: true,
  licenseInfo: true,
  notes: true,
  vendorId: true,
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
    name: driver.name,
    phone: driver.phone,
    email: driver.email,
    vehicleType: driver.vehicleType,
    vehicleNumber: driver.vehicleNumber,
    isActive: driver.isActive,
    driverType: driver.driverType,
    availabilityStatus: driver.availabilityStatus,
    licenseInfo: driver.licenseInfo,
    notes: driver.notes,
    vendorId: driver.vendorId,
    vendor: driver.vendor,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString(),
  };
}
