export type TripStage = 'request' | 'accepted' | 'arrived' | 'onTrip' | 'completed';
export type DriverTab = 'home' | 'trips' | 'earnings' | 'profile';
export type DriverView = DriverTab | 'documents' | 'vehicle' | 'settings' | 'help';
export type DriverStatus = 'online' | 'break' | 'offline';

export type AuthenticatedDriver = {
  id: string;
  driverCode?: string | null;
  fullName: string;
  email?: string | null;
  phone: string;
  dutyStatus: 'OFFLINE';
  vehicleNumber?: string | null;
  vehicleType?: string | null;
};

export const driverProfile = {
  name: 'Anmol Kapoor',
  phone: '+91 99155 60404',
  rating: '4.92',
  completedTrips: 1284,
  city: 'Jalandhar',
  vehicle: {
    model: 'Toyota Etios',
    type: 'Sedan',
    plate: 'PB08 UM 2040',
    fuel: 'Petrol',
  },
};

export const activeTrip = {
  id: 'UMD-2048',
  rider: 'Harpreet Kaur',
  pickup: 'Urban Estate Phase 2, Jalandhar',
  dropoff: 'Sri Guru Ram Dass Jee Airport, Amritsar',
  distance: '82 km',
  duration: '1 hr 38 min',
  fare: '₹3,250',
  pickupEta: '8 min',
  note: 'Airport luggage pickup. Call on arrival.',
};

export const earningsSummary = {
  today: '₹4,820',
  week: '₹27,450',
  tripsToday: 6,
  onlineHours: '7h 20m',
  incentives: '₹600',
};

export const recentTrips = [
  { id: 'UMD-2047', route: 'Model Town to PAP Chowk', fare: '₹420', time: '10:15 AM', completedAt: '2026-05-14T10:15:00+05:30' },
  { id: 'UMD-2046', route: 'Jalandhar to Ludhiana', fare: '₹2,100', time: '8:05 AM', completedAt: '2026-05-14T08:05:00+05:30' },
  { id: 'UMD-2045', route: 'Bus Stand to Urban Estate', fare: '₹310', time: 'Yesterday', completedAt: '2026-05-13T18:20:00+05:30' },
  { id: 'UMD-2044', route: 'Jalandhar to Amritsar Airport', fare: '₹3,250', time: 'May 10', completedAt: '2026-05-10T11:35:00+05:30' },
  { id: 'UMD-2043', route: 'Model Town to Phagwara', fare: '₹980', time: 'May 2', completedAt: '2026-05-02T16:10:00+05:30' },
  { id: 'UMD-2042', route: 'Jalandhar to Chandigarh', fare: '₹4,600', time: 'Apr 18', completedAt: '2026-04-18T09:15:00+05:30' },
];
