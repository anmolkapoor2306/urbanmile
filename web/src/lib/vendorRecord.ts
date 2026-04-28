import { Prisma } from '@prisma/client';

export const vendorRecordSelect = {
  id: true,
  name: true,
  /* displayName: true, */
  phone: true,
  email: true,
  isActive: true,
  contactPerson: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VendorSelect;


export type VendorRecord = Prisma.VendorGetPayload<{
  select: typeof vendorRecordSelect;
}>;

export type SerializedVendor = ReturnType<typeof serializeVendor>;

export function serializeVendor(vendor: VendorRecord) {
  return {
    id: vendor.id,
    name: vendor.name,
    /* displayName: vendor.displayName, */
    phone: vendor.phone,
    email: vendor.email,
    isActive: vendor.isActive,
    contactPerson: vendor.contactPerson,
    notes: vendor.notes,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  };
}

export function computeDisplayName(companyName: string | null | undefined, contactPerson: string | null | undefined): string {
  if (companyName && companyName.trim() !== '') {
    return companyName.trim();
  }
  if (contactPerson && contactPerson.trim() !== '') {
    return contactPerson.trim();
  }
  return 'Untitled Vendor';
}