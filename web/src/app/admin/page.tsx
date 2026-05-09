import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';
import { driverRecordSelect, serializeDriver } from '@/lib/driverRecord';
import { AdminPageFrame, AdminPanel } from '@/components/admin/AdminLayout';
import { MainDashboard } from '@/components/admin/MainDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  let loadError: string | null = null;
  const [bookingsResult, driversResult] = await Promise.allSettled([
    prisma.booking.findMany({
      select: bookingRecordSelect,
      orderBy: [{ pickupDateTime: 'asc' }],
      take: 1000,
    }),
    prisma.driver.findMany({
      select: driverRecordSelect,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    }),
  ]);

  if (bookingsResult.status === 'rejected') {
    console.error('Failed to load dashboard bookings:', bookingsResult.reason);
    loadError = 'Admin dashboard data is temporarily unavailable. Please check database connection.';
  }

  if (driversResult.status === 'rejected') {
    console.error('Failed to load dashboard drivers:', driversResult.reason);
    loadError = 'Admin dashboard data is temporarily unavailable. Please check database connection.';
  }

  const bookings = bookingsResult.status === 'fulfilled' ? bookingsResult.value : [];
  const drivers = driversResult.status === 'fulfilled' ? driversResult.value : [];

  return (
    <AdminPageFrame currentPage="dashboard">
      {loadError ? (
        <AdminPanel className="mb-4 shrink-0 border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          {loadError}
        </AdminPanel>
      ) : null}
      <MainDashboard bookings={bookings.map(serializeBooking)} drivers={drivers.map(serializeDriver)} />
    </AdminPageFrame>
  );
}
