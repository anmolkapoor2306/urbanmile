type MockBookingPayload = {
  pickupLocation: string;
  dropoffLocation: string;
  phone?: string;
};

export async function createQuickBooking(_data: MockBookingPayload) {
  return {
    success: true,
    data: {
      bookingReference: 'UM-MOCK-2048',
    },
  };
}

export async function createPublicBooking(_data: MockBookingPayload) {
  return createQuickBooking(_data);
}

export async function createBooking(_data: MockBookingPayload) {
  return createQuickBooking(_data);
}
