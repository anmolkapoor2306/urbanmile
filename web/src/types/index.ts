

export type BookingType = 'PERSONAL' | 'BUSINESS';

export interface BookingLocationMetadata {
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string;
  source?: 'manual' | 'autocomplete' | 'current-location';
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
  carType: 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY';
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

export type BookingStatus = 'NEW' | 'CONFIRMED' | 'ASSIGNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type CarType = 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY';
export type DriverType = 'OWN' | 'THIRD_PARTY' | 'VENDOR';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

export type Booking = {
  id: string;
  bookingReference: string;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  dropoffLocation: string;
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
  phone: string;
  email?: string | null;
  driverType: DriverType;
  availabilityStatus?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
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
