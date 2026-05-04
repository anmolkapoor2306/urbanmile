import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import { AdminPageFrame, AdminPanel, AdminStatCard, AdminStatsGrid } from '@/components/admin/AdminLayout';
import prisma from '@/lib/prisma';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';
import { getPaymentStatusLabel } from '@/lib/dispatch';
import { getBookingDisplayAssignee, sumMoney } from '@/lib/opsDashboard';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const bookings = (await prisma.booking.findMany({
    select: bookingRecordSelect,
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })).map(serializeBooking);

  const today = new Date();
  const revenueToday = sumMoney(
    bookings
      .filter((booking) => isSameDay(new Date(booking.createdAt), today))
      .map((booking) => booking.fareAmount)
  );
  const revenueThisWeek = sumMoney(
    bookings
      .filter((booking) => isWithinDays(new Date(booking.createdAt), 7))
      .map((booking) => booking.fareAmount)
  );
  const unpaidCompletedTrips = bookings.filter(
    (booking) => booking.status === 'COMPLETED' && booking.paymentStatus !== 'PAID'
  );
  const unpaidBalance = sumMoney(unpaidCompletedTrips.map((booking) => booking.fareAmount));
  const paidTrips = bookings.filter((booking) => booking.paymentStatus === 'PAID');
  const payoutTotal = sumMoney(bookings.map((booking) => booking.payoutAmount ?? booking.driverEarning));

  const paymentBreakdown = ['UNPAID', 'PAID', 'PENDING', 'REFUNDED', 'PARTIAL'].map((status) => ({
    status,
    count: bookings.filter((booking) => booking.paymentStatus === status).length,
    amount: sumMoney(bookings.filter((booking) => booking.paymentStatus === status).map((booking) => booking.fareAmount)),
  }));

  const payoutRows = bookings
    .filter((booking) => (booking.payoutAmount ?? booking.driverEarning) && getBookingDisplayAssignee(booking) !== 'Unassigned')
    .slice(0, 10);

  return (
    <AdminPageFrame currentPage="finance">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
        <div className="shrink-0">
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Finance</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Real payment, revenue, and payout visibility from booking records.
          </p>
        </div>

        <AdminStatsGrid className="mb-0 md:grid-cols-5">
          <AdminStatCard label="Revenue Today" value={formatMoney(revenueToday)} />
          <AdminStatCard label="Revenue This Week" value={formatMoney(revenueThisWeek)} />
          <AdminStatCard label="Unpaid Balance" value={formatMoney(unpaidBalance)} />
          <AdminStatCard label="Paid Trips" value={paidTrips.length} />
          <AdminStatCard label="Unpaid Completed" value={unpaidCompletedTrips.length} />
        </AdminStatsGrid>

        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <AdminPanel className="p-5">
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">Payment Status Breakdown</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Counts and fare totals by real booking payment status.</p>
            <div className="mt-5 space-y-3">
              {paymentBreakdown.map((item) => (
                <div key={item.status} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="font-bold text-zinc-950 dark:text-white">{getPaymentStatusLabel(item.status as never)}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">{item.count} trips</span>
                  <span className="font-bold text-zinc-950 dark:text-white">{formatMoney(item.amount)}</span>
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel className="flex min-h-0 flex-col overflow-hidden p-5">
            <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-zinc-950 dark:text-white">Driver / Vendor Payouts</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Only bookings with payout fields are shown.</p>
              </div>
              <div className="text-sm font-black text-zinc-950 dark:text-white">{formatMoney(payoutTotal)}</div>
            </div>
            <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
              {payoutRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                  No driver or vendor payout data has been recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {payoutRows.map((booking) => (
                    <div key={booking.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-black text-zinc-950 dark:text-white">{getBookingDisplayAssignee(booking)}</div>
                          <div className="mt-1 text-zinc-600 dark:text-zinc-400">{booking.publicBookingId || booking.bookingReference}</div>
                        </div>
                        <div className="text-right font-black text-zinc-950 dark:text-white">
                          {formatMoney(booking.payoutAmount ?? booking.driverEarning ?? 0)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AdminPanel>
        </div>
      </div>
    </AdminPageFrame>
  );
}

function isSameDay(date: Date, target: Date) {
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth() && date.getDate() === target.getDate();
}

function isWithinDays(date: Date, days: number) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return date >= start;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}
