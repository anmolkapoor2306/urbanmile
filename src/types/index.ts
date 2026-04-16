

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
  carType: 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY';
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

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type CarType = 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY';

export type Booking = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: Date;
  carType:CarType;
  specialInstructions: string | null;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
};

export interface CreateBookingInput extends Omit<BookingFormData, 'pickupDateTime'> {
  pickupDateTime: Date;
  carType: CarType;
}

export interface UpdateBookingStatusInput {
  id: string;
  status: BookingStatus;
}
