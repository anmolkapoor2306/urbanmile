import type { SerializedBooking } from '@/lib/bookingRecord';
import type { SerializedDriver } from '@/lib/driverRecord';

type AssigneeBooking = {
  driver?: { name: string | null } | null;
  manualDriverName?: string | null;
  manualVendorName?: string | null;
  vendor?: { name: string | null } | null;
};

function isSameDay(date: Date, target: Date) {
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}

function isWithinDays(date: Date, days: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return date >= start;
}

export function sumMoney(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

export function getBookingDisplayAssignee(booking: AssigneeBooking) {
  if (booking.driver?.name) {
    return booking.driver.name;
  }

  if (booking.manualDriverName) {
    return booking.manualDriverName;
  }

  if (booking.manualVendorName) {
    return booking.manualVendorName;
  }

  if (booking.vendor?.name) {
    return booking.vendor.name;
  }

  return 'Unassigned';
}

export function buildBookingMetrics(bookings: SerializedBooking[]) {
  const now = new Date();
  const completedToday = bookings.filter(
    (booking) => booking.completedAt && isSameDay(new Date(booking.completedAt), now)
  );

  const todaysBookings = bookings.filter((booking) => isSameDay(new Date(booking.createdAt), now));
  const unpaidBookings = bookings.filter((booking) => booking.paymentStatus !== 'PAID');
  const activeTrips = bookings.filter((booking) => booking.status === 'ACTIVE');

  return {
    total: bookings.length,
    new: bookings.filter((booking) => booking.status === 'NEW').length,
    pendingConfirmation: bookings.filter((booking) => booking.status === 'NEW').length,
    confirmed: bookings.filter((booking) => booking.status === 'CONFIRMED').length,
    assigned: bookings.filter((booking) => booking.status === 'ASSIGNED').length,
    inProgress: bookings.filter((booking) => booking.status === 'ACTIVE').length,
    completed: bookings.filter((booking) => booking.status === 'COMPLETED').length,
    completedToday: completedToday.length,
    cancelled: bookings.filter((booking) => booking.status === 'CANCELLED').length,
    activeTripsCount: activeTrips.length,
    revenueToday: sumMoney(todaysBookings.map((booking) => booking.fareAmount)),
    commissionToday: sumMoney(todaysBookings.map((booking) => booking.commissionAmount)),
    netEarningsToday: sumMoney(todaysBookings.map((booking) => booking.netEarningAmount ?? booking.commissionAmount)),
    unpaidAmount: sumMoney(unpaidBookings.map((booking) => booking.fareAmount)),
    revenueThisWeek: sumMoney(
      bookings.filter((booking) => isWithinDays(new Date(booking.createdAt), 7)).map((booking) => booking.fareAmount)
    ),
    revenueThisMonth: sumMoney(
      bookings.filter((booking) => isWithinDays(new Date(booking.createdAt), 30)).map((booking) => booking.fareAmount)
    ),
    driverPayoutToday: sumMoney(todaysBookings.map((booking) => booking.payoutAmount ?? booking.driverEarning)),
    confirmedWaitingForAssignment: bookings.filter(
      (booking) => booking.status === 'CONFIRMED' && !booking.driverId && !booking.manualDriverName && !booking.vendorId
    ),
    pendingConfirmationQueue: bookings.filter((booking) => booking.status === 'NEW'),
    activeTrips,
    recentBookings: [...bookings]
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      .slice(0, 8),
  };
}

export function buildDispatchMetrics(bookings: SerializedBooking[], drivers: SerializedDriver[]) {
  const metrics = buildBookingMetrics(bookings);

  return {
    totalDrivers: drivers.length,
    availableDrivers: drivers.filter((driver) => driver.isActive && driver.availabilityStatus === 'AVAILABLE').length,
    busyDrivers: drivers.filter((driver) => driver.availabilityStatus === 'BUSY').length,
    confirmedWaitingForDispatch: metrics.confirmedWaitingForAssignment.length,
    activeTrips: metrics.activeTripsCount,
    completedToday: metrics.completedToday,
  };
}
