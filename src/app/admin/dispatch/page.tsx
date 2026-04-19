import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { driverRecordSelect, serializeDriver, type DriverRecord } from '@/lib/driverRecord';
import { bookingRecordSelect, serializeBooking, type BookingRecord } from '@/lib/bookingRecord';
import { DispatchPageWrapper } from './page-client';

export const dynamic = 'force-dynamic';

export default async function DispatchPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  let drivers: DriverRecord[] = [];
  let bookings: BookingRecord[] = [];
  let loadError: string | null = null;

  try {
    drivers = await prisma.driver.findMany({
      select: driverRecordSelect,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  } catch (error) {
    console.error('Failed to load drivers for dispatch dashboard:', error);
    loadError = 'Database connection is unavailable. Showing available dispatch data only.';
  }

  try {
    bookings = await prisma.booking.findMany({
      select: bookingRecordSelect,
      orderBy: [{ pickupDateTime: 'asc' }, { createdAt: 'desc' }],
      take: 1000,
    });
  } catch (error) {
    console.error('Failed to load bookings for dispatch dashboard:', error);
    loadError = 'Database connection is unavailable. Showing available dispatch data only.';
  }

  return (
    <DispatchPageWrapper
      drivers={drivers.map(serializeDriver)}
      bookings={bookings.map(serializeBooking)}
      loadError={loadError}
    />
  );
}
