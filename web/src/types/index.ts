

export type BookingType = 'PERSONAL' | 'BUSINESS';

export interface BookingLocationMetadata {
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string;
  source?: 'manual' | 'autocomplete' | 'manual_pin' | 'current-location';
}

export interface BookingFormData {
  bookingType: BookingType;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  bookingMode?: 'ONE_WAY' | 'ROUND_TRIP';
  carType: 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY' | 'PREMIUM';
  fareAmount?: number | null;
  specialInstructions?: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  pickupPlaceId?: string;
  pickupLocationSource?: BookingLocationMetadata['source'];
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  dropoffPlaceId?: string;
  dropoffLocationSource?: BookingLocationMetadata['source'];
}

export type BookingStatus = 'NEEDS_ASSIGNMENT' | 'ASSIGNED' | 'ACTIVE' | 'COMPLETE' | 'CANCELLED';
export type CarType = 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY' | 'PREMIUM';
export type DriverType = 'OWN' | 'THIRD_PARTY' | 'VENDOR' | 'OWN_DRIVER' | 'VENDOR_DRIVER';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'PENDING' | 'REFUNDED' | 'PARTIAL';

export type Booking = {
  id: string;
  publicBookingId?: string;
  bookingReference: string;
  internalBookingReference?: string;
  customerPublicId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  roundTripGroupId?: string | null;
  parentPublicBookingId?: string | null;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  pickupPlaceId?: string | null;
  pickupLocationSource?: BookingLocationMetadata['source'] | string | null;
  dropoffLocation: string;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  dropoffPlaceId?: string | null;
  dropoffLocationSource?: BookingLocationMetadata['source'] | string | null;
  pickupDateTime: Date;
  bookingMode?: string | null;
  carType:CarType;
  specialInstructions: string | null;
  status: BookingStatus;
  paymentStatus?: PaymentStatus;
  driverId?: string | null;
  fareAmount?: number | null;
  commissionAmount?: number | null;
  payoutAmount?: number | null;
  netEarningAmount?: number | null;
  driverEarning?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface Driver {
  id: string;
  name: string;
  fullName?: string;
  phone: string;
  email?: string | null;
  driverType: DriverType;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  dutyStatus?: 'ONLINE' | 'OFFLINE' | 'BREAK' | 'ON_TRIP';
  availabilityStatus?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  vehicleType?: CarType | null;
  vehicleNumber?: string | null;
  licenseInfo?: string | null;
  notes?: string | null;
}

export interface CreateBookingInput extends Omit<BookingFormData, 'pickupDateTime'> {
  pickupDateTime: Date;
  carType: CarType;
}

export interface UpdateBookingStatusInput {
  id: string;
  status: BookingStatus;
}
