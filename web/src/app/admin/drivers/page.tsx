import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { driverRecordSelect, serializeDriver } from '@/lib/driverRecord';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';
import { backfillDriverCodes } from '@/lib/driverCode';
import { AdminPageFrame, AdminStatCard, AdminStatsGrid } from '@/components/admin/AdminLayout';
import { DriverManagementTable } from '@/components/admin/DriverManagementTable';

export const dynamic = 'force-dynamic';

export default async function DriversPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  await backfillDriverCodes(prisma);

  const [drivers, bookings] = await Promise.all([
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
