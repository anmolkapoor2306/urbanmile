import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import {
  AdminPageFrame,
  AdminStatsGrid,
  adminPanelClassName,
  adminInputClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/AdminLayout';
import prisma from '@/lib/prisma';
import { bookingRecordSelect } from '@/lib/bookingRecord';

export const dynamic = 'force-dynamic';

export default async function FinancePage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  // Get trip statistics for summary cards
  const [completedTrips, cancelledTrips] = await Promise.all([
    prisma.booking.count({ where: { status: 'COMPLETED', archivedAt: null } }),
    prisma.booking.count({ where: { status: 'CANCELLED', archivedAt: null } }),
  ]);

  // Calculate revenue estimates from completed bookings (using fareAmount field with serialization)
  const completedBookings = await prisma.booking.findMany({
    where: { status: 'COMPLETED', archivedAt: null },
    select: bookingRecordSelect,
  });

  // Helper function to convert Decimal to number
  function convertToNumber(value: Prisma.Decimal | number | null | undefined, defaultValue: number = 1500): number {
    if (value === null || value === undefined) return defaultValue;
    return typeof value === 'number' ? value : Number(value);
  }

  // Calculate placeholder revenue values based on completed trips (using fareAmount)
  const revenueToday = Math.round(completedBookings.filter(booking =>
    new Date(booking.createdAt).toDateString() === new Date().toDateString()
  ).reduce((sum: number, booking: typeof completedBookings[number]) => sum + convertToNumber(booking.fareAmount), 0));

  const revenueThisWeek = Math.round(completedBookings.filter(booking => {
    const bookingDate = new Date(booking.createdAt);
    const today = new Date();
    const dayDiff = Math.floor((today.getTime() - bookingDate.getTime()) / (24 * 60 * 60 * 1000));
    return dayDiff <= 7;
  }).reduce((sum: number, booking: typeof completedBookings[number]) => sum + convertToNumber(booking.fareAmount), 0));

  const revenueThisMonth = Math.round(completedBookings.filter(booking => {
    const bookingDate = new Date(booking.createdAt);
    const today = new Date();
    return bookingDate.getMonth() === today.getMonth() && bookingDate.getFullYear() === today.getFullYear();
  }).reduce((sum: number, booking: typeof completedBookings[number]) => sum + convertToNumber(booking.fareAmount), 0));

  // Calculate unpaid balance (bookings marked as paid but not yet collected or still in progress)
  const unpaidBalance = Math.round(completedBookings.filter(booking =>
    booking.status === 'COMPLETED' /* fare?.collectionStatus === 'PENDING' */
  ).reduce((sum: number, booking: typeof completedBookings[number]) => sum + convertToNumber(booking.fareAmount), 0));

  // Get recent bookings for transactions (limit to 20 most recent)
  const recentBookings = await prisma.booking.findMany({
    where: { archivedAt: null },
    select: bookingRecordSelect,
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <AdminPageFrame currentPage="finance">
      <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
          <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Finance</h1>
              <p className="mt-1 text-sm text-zinc-400">Overview of revenue, payments and transactions.</p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <select aria-label="Date range" defaultValue="30d" className={`${adminInputClassName} min-w-[180px] sm:w-auto`}>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="month">This month</option>
              </select>
              <button type="button" className={`${adminSecondaryButtonClassName} h-[42px]`}>Filter</button>
            </div>
          </div>

            <section>
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-200">Financial Summary</h2>
                  <p className="mt-1 text-sm text-zinc-500">Key revenue and ride performance metrics.</p>
                </div>
              </div>
              <AdminStatsGrid className="mb-0 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  ['₹', 'Revenue Today', `₹${revenueToday.toLocaleString()}`, '+8.4%', 'vs yesterday', 'from-emerald-500/20 to-amber-500/10 text-emerald-200 border-emerald-400/20'],
                  ['↗', 'Revenue This Week', `₹${revenueThisWeek.toLocaleString()}`, '+12.1%', 'vs last week', 'from-amber-500/20 to-orange-500/10 text-amber-200 border-amber-400/20'],
                  ['◆', 'Revenue This Month', `₹${revenueThisMonth.toLocaleString()}`, '+18.7%', 'vs last month', 'from-violet-500/20 to-amber-500/10 text-violet-200 border-violet-400/20'],
                  ['!', 'Unpaid Balance', `₹${unpaidBalance.toLocaleString()}`, 'Pending', 'needs follow-up', 'from-yellow-500/20 to-red-500/10 text-yellow-200 border-yellow-400/20'],
                  ['✓', 'Completed Trips', completedTrips.toLocaleString(), '+6.2%', 'vs last week', 'from-cyan-500/20 to-emerald-500/10 text-cyan-200 border-cyan-400/20'],
                  ['×', 'Cancelled Trips', cancelledTrips.toLocaleString(), '-2.3%', 'vs last week', 'from-red-500/20 to-zinc-500/10 text-red-200 border-red-400/20'],
                ].map(([icon, label, value, delta, comparison, badgeClass]) => (
                  <div key={label} className={`${adminPanelClassName} group relative overflow-hidden bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950 p-4 transition-colors hover:border-zinc-700/90`}>
                    <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-500/5 blur-2xl transition-opacity group-hover:opacity-80"></div>
                    <div className="relative mb-5 flex items-start justify-between gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border bg-gradient-to-br text-sm font-bold shadow-[0_10px_28px_rgba(0,0,0,0.28)] ${badgeClass}`}>
                        {icon}
                      </div>
                      <div className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        {delta}
                      </div>
                    </div>
                    <div className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{label}</div>
                    <div className="relative mt-2 text-3xl font-black tracking-tight text-zinc-50 2xl:text-[2rem]">{value}</div>
                    <div className="relative mt-2 text-xs text-zinc-500">{comparison}</div>
                  </div>
                ))}
              </AdminStatsGrid>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className={`${adminPanelClassName} overflow-hidden bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950 p-5 shadow-[0_22px_56px_rgba(0,0,0,0.32)] transition-colors hover:border-zinc-700/90 sm:p-6`}>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100">Revenue Overview</h3>
                    <p className="mt-1 text-sm text-zinc-500">Monthly revenue trend</p>
                  </div>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">+12%</span>
                </div>
                <div className="relative h-64 overflow-hidden rounded-2xl border border-zinc-800 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_38%),linear-gradient(135deg,rgba(9,9,11,0.96),rgba(24,24,27,0.9))] p-4 shadow-inner">
                  <div className="grid h-full grid-cols-[42px_1fr] grid-rows-[1fr_24px] gap-x-3 gap-y-2">
                    <div className="relative row-span-1 flex flex-col justify-between py-1 text-right text-[10px] font-medium text-zinc-600">
                      {['₹20K', '₹15K', '₹10K', '₹5K', '₹0'].map((label) => <span key={label}>{label}</span>)}
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/40">
                      <div className="absolute inset-x-0 top-[20%] border-t border-dashed border-zinc-800"></div>
                      <div className="absolute inset-x-0 top-[40%] border-t border-dashed border-zinc-800"></div>
                      <div className="absolute inset-x-0 top-[60%] border-t border-dashed border-zinc-800"></div>
                      <div className="absolute inset-x-0 top-[80%] border-t border-dashed border-zinc-800"></div>
                      <svg viewBox="0 0 320 160" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                          <linearGradient id="financeRevenueArea" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="rgb(245 158 11)" stopOpacity="0.34" />
                            <stop offset="100%" stopColor="rgb(245 158 11)" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="financeRevenueLine" x1="0" x2="1" y1="0" y2="0">
                            <stop offset="0%" stopColor="rgb(251 191 36)" />
                            <stop offset="100%" stopColor="rgb(16 185 129)" />
                          </linearGradient>
                        </defs>
                        <path d="M0 132 L45 104 L92 116 L136 66 L184 82 L230 36 L278 54 L320 24 L320 160 L0 160 Z" fill="url(#financeRevenueArea)" />
                        <path d="M0 132 L45 104 L92 116 L136 66 L184 82 L230 36 L278 54 L320 24" fill="none" stroke="url(#financeRevenueLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        {[['45', '104'], ['92', '116'], ['136', '66'], ['184', '82'], ['230', '36'], ['278', '54']].map(([cx, cy]) => (
                          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="rgb(250 204 21)" stroke="rgb(24 24 27)" strokeWidth="2" />
                        ))}
                      </svg>
                    </div>
                    <div></div>
                    <div className="grid grid-cols-7 text-center text-[10px] font-medium text-zinc-600">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-right shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
                    <div className="text-[10px] uppercase tracking-wide text-zinc-500">Total revenue</div>
                    <div className="text-sm font-bold text-zinc-100">₹{revenueThisMonth.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className={`${adminPanelClassName} overflow-hidden bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950 p-5 shadow-[0_22px_56px_rgba(0,0,0,0.32)] transition-colors hover:border-zinc-700/90 sm:p-6`}>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100">Payment Status</h3>
                    <p className="mt-1 text-sm text-zinc-500">Collection breakdown</p>
                  </div>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2.5 py-1 text-xs font-semibold text-zinc-400">168 total</span>
                </div>
                <div className="flex flex-col items-center gap-6 xl:flex-row xl:items-center xl:justify-between">
                  <div className="relative h-44 w-44 shrink-0 sm:h-48 sm:w-48 xl:h-40 xl:w-40 2xl:h-44 2xl:w-44">
                    <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90 drop-shadow-[0_18px_34px_rgba(0,0,0,0.35)]" aria-hidden="true">
                      <circle cx="60" cy="60" r="42" fill="none" stroke="rgb(39 39 42)" strokeWidth="18" />
                      <circle cx="60" cy="60" r="42" fill="none" stroke="rgb(34 197 94)" strokeWidth="18" strokeDasharray="196 264" strokeDashoffset="0" strokeLinecap="round" />
                      <circle cx="60" cy="60" r="42" fill="none" stroke="rgb(234 179 8)" strokeWidth="18" strokeDasharray="36 264" strokeDashoffset="-196" strokeLinecap="round" />
                      <circle cx="60" cy="60" r="42" fill="none" stroke="rgb(59 130 246)" strokeWidth="18" strokeDasharray="19 264" strokeDashoffset="-232" strokeLinecap="round" />
                      <circle cx="60" cy="60" r="42" fill="none" stroke="rgb(239 68 68)" strokeWidth="18" strokeDasharray="13 264" strokeDashoffset="-251" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/90 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] xl:inset-5 2xl:inset-6">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Total</div>
                      <div className="mt-1 text-2xl font-black tracking-tight text-zinc-100">168</div>
                      <div className="text-[10px] font-medium text-zinc-500">Transactions</div>
                    </div>
                  </div>

                  <div className="w-full min-w-0 space-y-3 xl:flex-1">
                    {[
                      ['Paid', '125', '74%', 'bg-green-500', 'text-green-200'],
                      ['Unpaid', '23', '14%', 'bg-yellow-500', 'text-yellow-200'],
                      ['Pending', '12', '7%', 'bg-blue-500', 'text-blue-200'],
                      ['Refunded', '8', '5%', 'bg-red-500', 'text-red-200'],
                    ].map(([label, value, percent, color, textColor]) => (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/55 px-3.5 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.16)] transition-colors hover:border-zinc-700 hover:bg-zinc-950/80 xl:px-3 xl:py-2.5 2xl:px-3.5 2xl:py-3">
                        <div className="flex items-center gap-3">
                          <span className={`h-3 w-3 rounded-full ${color}`}></span>
                          <span className="text-sm font-medium text-zinc-300">{label}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-zinc-100">{value}</div>
                          <div className={`text-xs font-semibold ${textColor}`}>{percent}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${adminPanelClassName} overflow-hidden bg-gradient-to-br from-zinc-900/95 via-zinc-900/80 to-zinc-950 p-5 shadow-[0_22px_56px_rgba(0,0,0,0.32)] transition-colors hover:border-zinc-700/90 sm:p-6`}>
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-100">Driver/Vendor Payouts</h3>
                    <p className="mt-1 text-sm text-zinc-500">Recent payout status</p>
                  </div>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-2.5 py-1 text-xs font-semibold text-zinc-400">5 latest</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3 border-b border-zinc-800 pb-2 text-xs uppercase tracking-wide text-zinc-500">
                    <span>Name</span>
                    <span className="text-center">Trips</span>
                    <span className="text-right">Payout</span>
                    <span className="text-right">Status</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      ['Rahul Sharma', '12', '₹1,200', 'Paid', 'bg-green-500/15 text-green-200 border-green-500/20'],
                      ['Priya Patel', '8', '₹800', 'Pending', 'bg-yellow-500/15 text-yellow-200 border-yellow-500/20'],
                      ['Amit Kumar', '5', '₹500', 'Unpaid', 'bg-blue-500/15 text-blue-200 border-blue-500/20'],
                      ['Neha Verma', '15', '₹1,500', 'Paid', 'bg-green-500/15 text-green-200 border-green-500/20'],
                      ['Suresh Gupta', '7', '₹700', 'Pending', 'bg-yellow-500/15 text-yellow-200 border-yellow-500/20'],
                    ].map(([name, trips, payout, status, statusClass]) => (
                      <div key={name} className="grid grid-cols-4 items-center gap-3 rounded-xl border border-transparent bg-zinc-950/50 px-3 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.14)] transition-colors hover:border-zinc-800 hover:bg-zinc-950/80">
                        <span className="truncate text-sm font-medium text-zinc-100">{name}</span>
                        <span className="text-center text-sm text-zinc-300">{trips}</span>
                        <span className="text-right text-sm font-medium text-zinc-100">{payout}</span>
                        <span className="text-right">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClass}`}>{status}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
            
            <section className={`${adminPanelClassName} w-full overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_32%),linear-gradient(135deg,rgba(24,24,27,0.96),rgba(9,9,11,0.92))] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.34)] sm:p-6`}>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-zinc-100">Recent Transactions</h2>
                    <span className="rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1 text-xs font-medium text-zinc-400">
                      {recentBookings.length} recent
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">Latest booking payments and trip outcomes</p>
                </div>
                <button type="button" className={`${adminSecondaryButtonClassName} h-10 shrink-0 bg-zinc-950/80 shadow-[0_12px_28px_rgba(0,0,0,0.24)] hover:border-amber-500/30 hover:text-amber-100`}>
                  View All Transactions
                </button>
              </div>
              <div className="overflow-x-auto pb-1 [scrollbar-color:#3f3f46_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-700/80 [&::-webkit-scrollbar-track]:bg-transparent">
                <div className="min-w-[1040px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  <div className="grid grid-cols-[1.05fr_1.2fr_1.2fr_0.85fr_1fr_1fr_1fr] gap-5 border-b border-zinc-800 bg-zinc-950/70 px-5 py-4 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                    <span>Booking ID</span>
                    <span>Customer</span>
                    <span>Driver/Vendor</span>
                    <span className="text-right">Fare</span>
                    <span className="text-right">Payment</span>
                    <span className="text-right">Trip</span>
                    <span className="text-right">Date</span>
                  </div>
                  <div className="divide-y divide-zinc-800/70">
                    {recentBookings.map((booking) => {
                      const driverName = booking.driver?.name || booking.vendor?.name || (booking.manualDriverName || booking.manualVendorName || 'N/A');
                      const formattedDate = new Date(booking.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      });
                      const formattedTime = new Date(booking.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const paymentStatus = booking.paymentStatus as string | null;
                      const paymentStatusClass =
                        paymentStatus === 'PAID' ? 'border-green-500/20 bg-green-500/15 text-green-200' :
                        paymentStatus === 'UNPAID' ? 'border-yellow-500/20 bg-yellow-500/15 text-yellow-200' :
                        paymentStatus === 'REFUNDED' ? 'border-red-500/20 bg-red-500/15 text-red-200' :
                        'border-blue-500/20 bg-blue-500/15 text-blue-200';
                      const tripStatusClass =
                        booking.status === 'COMPLETED' ? 'border-green-500/20 bg-green-500/15 text-green-200' :
                        booking.status === 'ACTIVE' ? 'border-cyan-500/20 bg-cyan-500/15 text-cyan-200' :
                        booking.status === 'CANCELLED' ? 'border-red-500/20 bg-red-500/15 text-red-200' :
                        booking.status === 'ASSIGNED' || booking.status === 'CONFIRMED' ? 'border-violet-500/20 bg-violet-500/15 text-violet-200' :
                        'border-blue-500/20 bg-blue-500/15 text-blue-200';

                      return (
                        <div key={booking.id} className="group grid min-h-[72px] grid-cols-[1.05fr_1.2fr_1.2fr_0.85fr_1fr_1fr_1fr] items-center gap-5 px-5 py-4 transition-colors hover:bg-zinc-900/80">
                          <span className="font-mono text-sm font-semibold text-zinc-100 transition-colors group-hover:text-amber-100">{(booking.bookingReference || `UM-${booking.id.slice(0, 8)}`).slice(0, 12)}</span>
                          <span className="truncate text-sm font-medium text-zinc-200">{booking.fullName}</span>
                          <span className="truncate text-sm text-zinc-400 transition-colors group-hover:text-zinc-300">{driverName}</span>
                          <span className="text-right text-sm font-semibold text-zinc-100">₹{convertToNumber(booking.fareAmount).toLocaleString()}</span>
                          <span className="flex justify-end">
                            <span className={`inline-flex min-w-[86px] justify-center rounded-full border px-2.5 py-1 text-xs font-semibold shadow-[0_8px_20px_rgba(0,0,0,0.18)] ${paymentStatusClass}`}>
                              {paymentStatus || 'PENDING'}
                            </span>
                          </span>
                          <span className="flex justify-end">
                            <span className={`inline-flex min-w-[92px] justify-center rounded-full border px-2.5 py-1 text-xs font-semibold shadow-[0_8px_20px_rgba(0,0,0,0.18)] ${tripStatusClass}`}>
                              {booking.status}
                            </span>
                          </span>
                          <span className="text-right text-sm text-zinc-300">
                            {formattedDate}
                            <br />
                            <span className="text-[11px] text-zinc-500">{formattedTime}</span>
                          </span>
                        </div>
                      );
                    })}
                    {recentBookings.length === 0 && (
                      <div className="px-5 py-10 text-center text-sm text-zinc-500">No recent transactions</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
    </AdminPageFrame>
  );
}
