export const customer = {
  name: 'Anmol Kapoor',
  phone: '+91 99155 60404',
  email: 'anmolkapoor2306@gmail.com',
  pickupArea: 'Model Town, Jalandhar',
};

export const recentPlaces = [
  { id: 'airport', title: 'Amritsar Airport', subtitle: 'Sri Guru Ram Dass Jee International Airport' },
  { id: 'office', title: 'Urban Estate Phase 2', subtitle: 'Jalandhar, Punjab' },
  { id: 'hotel', title: 'Volga Hotel', subtitle: 'Queens Road, Amritsar' },
];

export const savedPlaces: SavedPlace[] = [];

export type SavedPlace = {
  id: string;
  label: string;
  address: string;
  note?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export const suggestions = [
  'Amritsar Airport Terminal 1',
  'Phagwara Bus Stand',
  'Ludhiana Railway Station',
  'Chandigarh Sector 17',
  'Jalandhar City Railway Station',
];

export const rideOptions = [
  { id: 'eco', name: 'Miles Eco', eta: '4 min', fare: '₹420', capacity: '4 seats', note: 'Clean sedan, best value' },
  { id: 'xl', name: 'Miles XL', eta: '7 min', fare: '₹620', capacity: '6 seats', note: 'Extra space for family trips' },
  { id: 'premium', name: 'Miles Premium', eta: '9 min', fare: '₹890', capacity: '4 seats', note: 'Premium car with top-rated driver' },
];

export const coupons = [
  { id: 'first50', code: 'FIRST50', title: 'First ride offer', detail: 'Save 50% up to ₹120 on your first ride.' },
  { id: 'airport100', code: 'AIRPORT100', title: 'Airport saver', detail: 'Flat ₹100 off on airport transfers.' },
  { id: 'outstation200', code: 'OUTSTATION200', title: 'Outstation deal', detail: 'Save ₹200 on rides above 80 km.' },
];

export const rideHistory = [
  { id: 'UM-2048', route: 'Model Town to Amritsar Airport', date: '15 May, 09:20 AM', fare: '₹3,250', status: 'Completed' },
  { id: 'UM-2047', route: 'Urban Estate to PAP Chowk', date: '14 May, 06:15 PM', fare: '₹420', status: 'Completed' },
  { id: 'UM-2046', route: 'Jalandhar to Ludhiana', date: '11 May, 08:05 AM', fare: '₹2,100', status: 'Completed' },
  { id: 'UM-2045', route: 'Model Town to Chandigarh', date: '08 May, 11:30 AM', fare: '₹4,600', status: 'Cancelled' },
];

export const activeDriver = {
  name: 'Harpreet Singh',
  vehicle: 'PB08 UM 2040',
  car: 'White Toyota Etios',
  eta: '5 min',
  otp: '4821',
};
