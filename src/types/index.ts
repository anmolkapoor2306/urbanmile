

export type BookingType = 'PERSONAL' | 'BUSINESS';

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
