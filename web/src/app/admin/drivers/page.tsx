import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { driverRecordSelect, serializeDriver } from '@/lib/driverRecord';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';
import { backfillDriverCodes } from '@/lib/driverCode';
import { AdminPageFrame, AdminStatCard, AdminStatsGrid } from '@/components/admin/AdminLayout';
import { DriverManagementTable } from '@/components/admin/DriverManagementTable';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

export const dynamic = 'force-dynamic';

export default async function DriversPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  try {
    await backfillDriverCodes(prisma);
  } catch (error) {
    console.error('Failed to backfill driver codes:', error);

    return (
      <AdminPageFrame currentPage="drivers">
        <AdminEmptyState
          title="Driver data is temporarily unavailable"
          description="Driver data is temporarily unavailable. Please check database connection."
        />
      </AdminPageFrame>
    );
  }

  const [driversResult, bookingsResult] = await Promise.allSettled([
    prisma.driver.findMany({
      select: driverRecordSelect,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    }),
    prisma.booking.findMany({
      where: { status: { in: ['ASSIGNED', 'ACTIVE'] } },
      select: bookingRecordSelect,
      orderBy: [{ pickupDateTime: 'asc' }],
      take: 500,
    }),
  ]);

  if (driversResult.status === 'rejected') {
    console.error('Failed to load drivers:', driversResult.reason);

    return (
      <AdminPageFrame currentPage="drivers">
        <AdminEmptyState
          title="Driver data is temporarily unavailable"
          description="Driver data is temporarily unavailable. Please check database connection."
        />
      </AdminPageFrame>
    );
  }

  if (bookingsResult.status === 'rejected') {
    console.error('Failed to load active driver bookings:', bookingsResult.reason);
  }

  const drivers = driversResult.value;
  const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value : [];

  const serializedDrivers = drivers.map(serializeDriver);
  const serializedBookings = bookings.map(serializeBooking);

  return (
    <AdminPageFrame currentPage="drivers">
      <div className="flex h-full w-full flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
          <AdminStatsGrid className="xl:grid-cols-4">
            {[
              ['Total Drivers', serializedDrivers.length],
              ['Available', serializedDrivers.filter((driver) => driver.isActive && driver.availabilityStatus === 'AVAILABLE').length],
              ['Assigned / On Trip', serializedBookings.length],
              ['Vendors', serializedDrivers.filter((driver) => driver.driverType === 'VENDOR').length],
            ].map(([label, value]) => (
              <AdminStatCard key={label} label={label} value={value} />
            ))}
          </AdminStatsGrid>

          <div className="flex w-full min-w-0 flex-1 min-h-0 overflow-hidden">
            <DriverManagementTable drivers={serializedDrivers} bookings={serializedBookings} />
          </div>
      </div>
    </AdminPageFrame>
  );
}
