import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated, getCurrentAdminSession } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import prisma from '@/lib/prisma';
import { driverRecordSelect, serializeDriver, type DriverRecord } from '@/lib/driverRecord';
import { bookingRecordSelect, serializeBooking, type BookingRecord } from '@/lib/bookingRecord';
import { backfillDriverCodes } from '@/lib/driverCode';
import { AdminPageFrame, AdminStatCard, AdminStatsGrid } from '@/components/admin/AdminLayout';
import { DriverManagementTable } from '@/components/admin/DriverManagementTable';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

export const dynamic = 'force-dynamic';

export default async function DriversPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'drivers')) redirect('/admin/forbidden');

  try {
    await backfillDriverCodes(prisma);
  } catch (error) {
    console.error('Failed to backfill driver codes:', error);

    return (
      <AdminPageFrame currentPage="drivers" adminRole={session?.role}>
        <AdminEmptyState
          title="Driver data is temporarily unavailable"
          description="Driver data is temporarily unavailable. Please check database connection."
        />
      </AdminPageFrame>
    );
  }

  let drivers: DriverRecord[];
  let bookings: BookingRecord[] = [];

  try {
    drivers = await prisma.driver.findMany({
      select: driverRecordSelect,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  } catch (error) {
    console.error('Failed to load drivers:', error);

    return (
      <AdminPageFrame currentPage="drivers" adminRole={session?.role}>
        <AdminEmptyState
          title="Driver data is temporarily unavailable"
          description="Driver data is temporarily unavailable. Please check database connection."
        />
      </AdminPageFrame>
    );
  }

  try {
    bookings = await prisma.booking.findMany({
      where: { status: { in: ['ASSIGNED', 'ACTIVE'] } },
      select: bookingRecordSelect,
      orderBy: [{ pickupDateTime: 'asc' }],
      take: 500,
    });
  } catch (error) {
    console.error('Failed to load active driver bookings:', error);
  }

  const serializedDrivers = drivers.map(serializeDriver);
  const serializedBookings = bookings.map(serializeBooking);

  return (
    <AdminPageFrame currentPage="drivers" adminRole={session?.role}>
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
