import Constants from 'expo-constants';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
  'http://localhost:3000';

type PublicBookingPayload = {
  bookingType: 'PERSONAL' | 'BUSINESS';
  fullName: string;
  email?: string;
  phone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  carType: 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY';
  specialInstructions?: string;
};

type PublicBookingResponse = {
  success?: boolean;
  data?: {
    bookingReference?: string;
  };
  error?: string;
};

function getApiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/$/, '')}${path}`;
}

async function parseApiError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error || `API request failed with status ${response.status}`;
  } catch {
    return `API request failed with status ${response.status}`;
  }
}

export async function createPublicBooking(data: PublicBookingPayload) {
  const response = await fetch(getApiUrl('/api/bookings/public'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json() as Promise<PublicBookingResponse>;
}

export async function createQuickBooking(data: {
  pickupLocation: string;
  dropoffLocation: string;
  phone: string;
}) {
  return createPublicBooking({
    bookingType: 'PERSONAL',
    fullName: 'Mobile rider',
    email: '',
    phone: data.phone,
    pickupLocation: data.pickupLocation,
    dropoffLocation: data.dropoffLocation,
    pickupDateTime: new Date().toISOString(),
    carType: 'SEDAN',
    specialInstructions: 'Mobile quick booking',
  });
}

export async function createBooking(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  dropoffLocation: string;
  rideDate: string;
  rideTime: string;
  carType: string;
  paymentMethod: string;
}) {
  const response = await fetch(getApiUrl('/api/bookings/public'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bookingType: 'PERSONAL',
      fullName: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      phone: data.phone,
      pickupLocation: data.pickupLocation,
      dropoffLocation: data.dropoffLocation,
      pickupDateTime: `${data.rideDate}T${data.rideTime}`,
      carType: data.carType.toUpperCase(),
      specialInstructions: `Payment: ${data.paymentMethod}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}
