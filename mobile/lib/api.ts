const API_BASE_URL = 'https://your-urbanmiles-backend.com';

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
  const response = await fetch(`${API_BASE_URL}/api/bookings/public`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json();
}
