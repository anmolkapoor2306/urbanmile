import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';
import { AdminPageFrame, AdminPanel, AdminStatsGrid, AdminStatCard } from '@/components/admin/AdminLayout';
import { BookingTable } from '@/components/admin/BookingTable';
import { BOOKING_STATUSES } from '@/lib/dispatch';

export const dynamic = 'force-dynamic';

export default async function AdminBookingsPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const bookings = await prisma.booking.findMany({
    select: bookingRecordSelect,
    orderBy: [{ pickupDateTime: 'asc' }, { createdAt: 'desc' }],
    take: 1000,
  });

  const serializedBookings = bookings.map(serializeBooking);
  const activeBookings = serializedBookings.filter((booking) => !['COMPLETED', 'CANCELLED'].includes(booking.status));

  const activeCount = activeBookings.filter((booking) => booking.status === BOOKING_STATUSES[3]).length;

  return (
    <AdminPageFrame currentPage="bookings">
      <div className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden">
        <AdminStatsGrid className="md:grid-cols-3 xl:grid-cols-6">
              {[
                ['Total', activeBookings.length],
                ['Needs Assignment', activeBookings.filter((booking) => booking.status === BOOKING_STATUSES[1] && !booking.driverId).length],
                ['Assigned', activeBookings.filter((booking) => booking.status === BOOKING_STATUSES[2]).length],
                ['Active', activeCount],
                ['Completed', activeBookings.filter((booking) => booking.status === BOOKING_STATUSES[4]).length],
                ['Cancelled', activeBookings.filter((booking) => booking.status === BOOKING_STATUSES[5]).length],
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
