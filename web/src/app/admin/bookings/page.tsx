import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated, getCurrentAdminSession } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import prisma from '@/lib/prisma';
import { findBookingRecords, serializeBooking } from '@/lib/bookingRecord';
import { AdminPageFrame, AdminPanel, AdminStatsGrid, AdminStatCard } from '@/components/admin/AdminLayout';
import { BookingTable } from '@/components/admin/BookingTable';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

export const dynamic = 'force-dynamic';

export default async function AdminBookingsPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'bookings')) redirect('/admin/forbidden');

  let bookings;

  try {
    bookings = await findBookingRecords(prisma, { take: 1000 });
  } catch (error) {
    console.warn('Failed to load admin bookings:', error instanceof Error ? error.message : error);

    return (
      <AdminPageFrame currentPage="bookings" adminRole={session?.role}>
        <AdminEmptyState
          title="Bookings are temporarily unavailable"
          description="Booking data is temporarily unavailable. Please check database connection."
        />
      </AdminPageFrame>
    );
  }

  const serializedBookings = bookings.map(serializeBooking);
  const activeBookings = serializedBookings.filter((booking) => !['COMPLETE', 'CANCELLED'].includes(booking.status));

  const activeCount = activeBookings.filter((booking) => booking.status === 'ACTIVE').length;
  const completedCount = serializedBookings.filter((booking) => booking.status === 'COMPLETE').length;
  const cancelledCount = serializedBookings.filter((booking) => booking.status === 'CANCELLED').length;

  return (
    <AdminPageFrame currentPage="bookings" adminRole={session?.role}>
      <div className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
        <AdminStatsGrid className="md:grid-cols-3 xl:grid-cols-6">
              {[
                ['Total', serializedBookings.length],
                ['Needs Assignment', activeBookings.filter((booking) => booking.status === 'NEEDS_ASSIGNMENT' && !booking.driverId).length],
                ['Assigned', activeBookings.filter((booking) => booking.status === 'ASSIGNED').length],
                ['Active', activeCount],
                ['Complete', completedCount],
                ['Cancelled', cancelledCount],
              ].map(([label, value]) => (
                <AdminStatCard key={label} label={label} value={value} className="text-center" />
              ))}
        </AdminStatsGrid>

        <AdminPanel className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-zinc-200 p-5 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-zinc-950 dark:text-zinc-100">Bookings</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Search, update trip status, edit fare, and track payment visibility.</p>
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{activeBookings.length} active bookings</span>
              </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden p-5">
              <BookingTable bookings={serializedBookings} />
            </div>
        </AdminPanel>
      </div>
    </AdminPageFrame>
  );
}
