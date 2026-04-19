import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';
import { DashboardHeader } from '@/components/admin/DashboardHeader';
import { BookingTable } from '@/components/admin/BookingTable';

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

  return (
    <div className="h-screen min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <DashboardHeader title="Bookings Management" currentPage="bookings" />

      <main className="flex flex-1 min-h-0 overflow-hidden flex-col">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 min-h-0 flex flex-col">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 shrink-0 mb-8">
            {[
              ['Total', serializedBookings.length],
              ['New', serializedBookings.filter((booking) => booking.status === 'NEW').length],
              ['Confirmed', serializedBookings.filter((booking) => booking.status === 'CONFIRMED').length],
              ['Assigned', serializedBookings.filter((booking) => booking.status === 'ASSIGNED').length],
              ['In Progress', serializedBookings.filter((booking) => booking.status === 'IN_PROGRESS').length],
              ['Completed', serializedBookings.filter((booking) => booking.status === 'COMPLETED').length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">{label}</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
              </div>
            ))}
          </div>

          <section className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="shrink-0 border-b border-zinc-200 p-4 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">All Bookings</h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Confirm fares, monitor ride lifecycle, send rides to dispatch, and manage payment status.</p>
                </div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">{serializedBookings.length} bookings</span>
              </div>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden p-4">
              <BookingTable bookings={serializedBookings} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
