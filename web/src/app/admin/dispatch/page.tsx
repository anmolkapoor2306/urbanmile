import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated, getCurrentAdminSession } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import prisma from '@/lib/prisma';
import { driverRecordSelect, serializeDriver, type DriverRecord } from '@/lib/driverRecord';
import { findBookingRecords, serializeBooking, type BookingRecord } from '@/lib/bookingRecord';
import { getOperationalZones } from '@/lib/operationalZones';
import { isBookingDispatchableByZone, type SerializedOperationalZone } from '@/lib/operationalZoneRules';
import { DispatchPageWrapper } from './page-client';

export const dynamic = 'force-dynamic';

export default async function DispatchPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'dispatch')) redirect('/admin/forbidden');

  let drivers: DriverRecord[] = [];
  let bookings: BookingRecord[] = [];
  let operationalZones: SerializedOperationalZone[] = [];
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
    bookings = await findBookingRecords(prisma, { activeOnly: true, take: 1000 });
  } catch (error) {
    console.error('Failed to load bookings for dispatch dashboard:', error);
    loadError = 'Database connection is unavailable. Showing available dispatch data only.';
  }

  try {
    operationalZones = await getOperationalZones(prisma);
  } catch (error) {
    console.warn('Failed to load operational zones for dispatch dashboard:', error instanceof Error ? error.message : error);
    loadError = 'Operational zones are unavailable. Dispatch queue may show unfiltered bookings.';
  }

  return (
    <DispatchPageWrapper
      drivers={drivers.map(serializeDriver)}
      bookings={bookings.map(serializeBooking).filter((booking) => isBookingDispatchableByZone(operationalZones, booking))}
      operationalZones={operationalZones}
      loadError={loadError}
      adminRole={session?.role}
    />
  );
}
