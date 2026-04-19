import Link from 'next/link';
import type { SerializedBooking } from '@/lib/bookingRecord';
import { buildBookingMetrics, getBookingDisplayAssignee } from '@/lib/opsDashboard';
import { getBookingStatusLabel } from '@/lib/dispatch';
import { getCarTypeDisplay, getStatusColor } from '@/lib/utils';

export function MainDashboard({ bookings }: { bookings: SerializedBooking[] }) {
  const metrics = buildBookingMetrics(bookings);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        {[
          { label: 'Total Bookings', value: metrics.total },
          { label: 'Pending Confirmation', value: metrics.pendingConfirmation },
          { label: 'Confirmed', value: metrics.confirmed },
          { label: 'Assigned', value: metrics.assigned },
          { label: 'In Progress', value: metrics.inProgress },
          { label: 'Completed Today', value: metrics.completedToday },
          { label: 'Cancelled', value: metrics.cancelled },
        ].map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Revenue Snapshot</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">A quick financial pulse without leaving the operations workflow.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:min-w-[480px] lg:grid-cols-4">
            <RevenueMetric label="Revenue Today" value={metrics.revenueToday ?? 0} />
            <RevenueMetric label="Revenue This Week" value={metrics.revenueThisWeek ?? 0} />
            <RevenueMetric label="Net Today" value={metrics.netEarningsToday ?? 0} />
            <RevenueMetric label="Unpaid" value={metrics.unpaidAmount ?? 0} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <QueuePanel
          title="Bookings"
          subtitle="Customers waiting for a fare confirmation call."
          bookings={metrics.pendingConfirmationQueue}
          emptyMessage="No new bookings waiting for confirmation."
          actionHref="/admin/bookings"
          actionLabel="Open Bookings"
          scrollable
          centeredHeader
          hideActionButton
        />

        <QueuePanel
          title="Confirmed Waiting for Dispatch"
          subtitle="Confirmed bookings ready to be assigned to a driver."
          bookings={metrics.confirmedWaitingForAssignment.slice(0, 6)}
          emptyMessage="No confirmed bookings waiting for dispatch."
          actionHref="/admin/dispatch"
          actionLabel="Open Dispatch"
          centeredHeader
          hideActionButton
        />

        <QueuePanel
          title="Active Trips"
          subtitle="Assigned and in-progress rides currently being tracked."
          bookings={metrics.activeTrips.slice(0, 6)}
          emptyMessage="No active trips right now."
          actionHref="/admin/dispatch"
          actionLabel="Manage Trips"
          centeredHeader
          hideActionButton
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="text-sm text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function RevenueMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(value)}</div>
    </div>
  );
}

function QueuePanel({
  title,
  subtitle,
  bookings,
  emptyMessage,
  actionHref,
  actionLabel,
  scrollable = false,
  centeredHeader = false,
  hideActionButton = false,
}: {
  title: string;
  subtitle: string;
  bookings: SerializedBooking[];
  emptyMessage: string;
  actionHref: string;
  actionLabel: string;
  scrollable?: boolean;
  centeredHeader?: boolean;
  hideActionButton?: boolean;
}) {
  return (
    <section className={`rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800${scrollable ? ' flex h-[32rem] flex-col' : ''}`}>
      <div className={`mb-4 flex items-start gap-4${centeredHeader ? ' justify-center text-center' : ' justify-between'}`}>
        <Link href={actionHref} className="group block min-w-0">
          <h2 className="inline-block text-lg font-semibold text-zinc-900 transition-colors transition-transform duration-150 group-hover:scale-105 group-hover:text-amber-500 dark:text-zinc-100 dark:group-hover:text-amber-400">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </Link>
        {hideActionButton ? null : (
          <Link
            href={actionHref}
            className="inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {actionLabel}
          </Link>
        )}
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          {emptyMessage}
        </div>
      ) : (
        <div className={scrollable ? 'flex-1 min-h-0 overflow-y-auto space-y-3 pr-1' : 'space-y-3'}>
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1.5">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{booking.bookingReference}</div>
                  <div className="truncate text-sm text-zinc-900 dark:text-zinc-100">
                    {booking.pickupLocation} to {booking.dropoffLocation}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {booking.fullName} · {formatDateTime(booking.pickupDateTime)} · {getCarTypeDisplay(booking.carType)}
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Fare {booking.fareAmount ? formatMoney(booking.fareAmount) : 'Pending'} · {getBookingDisplayAssignee(booking)}
                  </div>
                </div>

                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                  {getBookingStatusLabel(booking.status as never)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
