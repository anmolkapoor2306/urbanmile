import Link from 'next/link';
import { AdminPanel, AdminStatCard, AdminStatsGrid, adminSecondaryButtonClassName } from '@/components/admin/AdminLayout';
import type { SerializedBooking } from '@/lib/bookingRecord';
import type { SerializedDriver } from '@/lib/driverRecord';
import { buildBookingMetrics, buildDispatchMetrics, getBookingDisplayAssignee } from '@/lib/opsDashboard';
import { getBookingStatusLabel, getPaymentStatusLabel } from '@/lib/dispatch';
import { cn, getCarTypeDisplay } from '@/lib/utils';

export function MainDashboard({
  bookings,
  drivers,
}: {
  bookings: SerializedBooking[];
  drivers: SerializedDriver[];
}) {
  const metrics = buildBookingMetrics(bookings);
  const dispatchMetrics = buildDispatchMetrics(bookings, drivers);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Assign trusted drivers, monitor active trips, and keep payment visibility clear.
        </p>
      </div>

      <AdminStatsGrid className="mb-0 sm:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="Needs Assignment" value={metrics.needsAssignment} />
        <AdminStatCard label="Assigned Upcoming" value={metrics.assignedUpcoming} />
        <AdminStatCard label="Active Trips" value={metrics.activeTripsCount} />
        <AdminStatCard label="Completed Today" value={metrics.completedToday} />
        <AdminStatCard label="Revenue Today" value={formatMoney(metrics.revenueToday ?? 0)} />
      </AdminStatsGrid>

      <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[minmax(0,1.08fr)_minmax(0,0.92fr)] gap-3 overflow-hidden">
        <div className="grid min-h-0 min-w-0 items-stretch gap-4 overflow-hidden md:grid-cols-2">
          <NeedsAssignmentPanel bookings={metrics.confirmedWaitingForAssignment} />
          <LiveTripsPanel bookings={metrics.liveTrips} />
        </div>

        <div className="grid min-h-0 min-w-0 gap-3 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <DriverAvailabilityPanel metrics={dispatchMetrics} bookings={bookings} drivers={drivers} />
          <UpcomingTripsPanel bookings={metrics.upcomingTrips} />
        </div>
      </div>
    </div>
  );
}

function NeedsAssignmentPanel({ bookings }: { bookings: SerializedBooking[] }) {
  return (
    <AdminPanel className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3 xl:p-4">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-black text-zinc-950 dark:text-white xl:text-lg">Needs Assignment</h2>
            <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-black text-amber-800 dark:bg-amber-400 dark:text-zinc-950">
              {bookings.length}
            </span>
          </div>
          <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 xl:text-sm">Confirmed rides waiting for a driver.</p>
        </div>
        <Link href="/admin/dispatch" className={cn(adminSecondaryButtonClassName, 'hidden shrink-0 px-3 py-1.5 text-xs sm:inline-flex')}>
          Open Dispatch
        </Link>
      </div>

      <div className="hidden shrink-0 grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)_minmax(0,0.75fr)_minmax(0,0.5fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_76px] gap-3 border-b border-zinc-200 px-3 pb-2 text-[11px] font-black uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-500 xl:grid">
        <span>Booking ID</span>
        <span>Route</span>
        <span>Pickup Time</span>
        <span>Vehicle</span>
        <span>Fare</span>
        <span>Payment</span>
        <span className="text-right">Action</span>
      </div>

      <div className="dashboard-scrollbar min-h-0 max-h-[320px] flex-1 overflow-x-auto overflow-y-auto pr-1">
        {bookings.length === 0 ? (
          <EmptyState message="No confirmed rides are waiting for assignment." />
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {bookings.map((booking) => (
              <NeedsAssignmentRow key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </AdminPanel>
  );
}

function LiveTripsPanel({ bookings }: { bookings: SerializedBooking[] }) {
  return (
    <AdminPanel className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden p-3 xl:p-4">
      <PanelHeader title="Live Trips" subtitle="Assigned and active trips currently under dispatch control." />
      <div className="dashboard-scrollbar min-h-0 max-h-[320px] flex-1 overflow-y-auto pr-1">
        {bookings.length === 0 ? (
          <EmptyState message="No assigned or active trips right now." />
        ) : (
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {bookings.map((booking) => (
              <div key={booking.id} className="grid min-w-0 gap-3 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-bold', statusClass(booking.status))}>
                      {getBookingStatusLabel(booking.status as never)}
                    </span>
                    <span className="min-w-0 truncate text-sm font-black text-zinc-950 dark:text-white">{booking.publicBookingId || booking.bookingReference}</span>
                  </div>
                  <div className="mt-2 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {booking.pickupLocation} to {booking.dropoffLocation}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    <span>{getBookingDisplayAssignee(booking)}</span>
                    <span>{getCarTypeDisplay(booking.carType)}</span>
                    <span>{formatDateTime(booking.pickupDateTime)}</span>
                  </div>
                </div>
                {booking.phone ? (
                  <a href={`tel:${booking.phone}`} className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white dark:bg-amber-400 dark:text-zinc-950">
                    Call
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPanel>
  );
}

function DriverAvailabilityPanel({
  metrics,
  bookings,
  drivers,
}: {
  metrics: ReturnType<typeof buildDispatchMetrics>;
  bookings: SerializedBooking[];
  drivers: SerializedDriver[];
}) {
  const driverSchedules = drivers
    .map((driver) => ({
      driver,
      nextBooking: findNextBookingForDriver(bookings, driver.id),
    }))
    .filter((row) => row.nextBooking)
    .sort((a, b) => +new Date(a.nextBooking?.pickupDateTime ?? 0) - +new Date(b.nextBooking?.pickupDateTime ?? 0))
    .slice(0, 3);
  const noDriversAvailable = metrics.availableDrivers === 0;

  return (
    <AdminPanel className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden p-3 xl:p-4', noDriversAvailable && 'border-red-300 dark:border-red-800')}>
      <PanelHeader title="Driver Availability" subtitle="Actionable driver capacity." actionHref="/admin/dispatch" actionLabel="Open Dispatch" />
      <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-5">
          <AvailabilityStat label="Available" value={metrics.availableDrivers} warning={noDriversAvailable} />
          <AvailabilityStat label="Assigned" value={metrics.busyDrivers} />
          <AvailabilityStat label="On Trip" value={metrics.activeTrips} />
          <AvailabilityStat label="Off Duty" value={metrics.offDutyDrivers} />
          <AvailabilityStat label="Vendor Available" value={metrics.vendorAvailableDrivers} />
        </div>
        {noDriversAvailable ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            No available drivers. Open Dispatch to clear conflicts or move a driver off duty.
          </div>
        ) : null}
        <div className="mt-3 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-zinc-50 text-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {driverSchedules.length === 0 ? (
            <div className="px-3 py-2.5 font-semibold text-zinc-500 dark:text-zinc-400">No assigned driver bookings scheduled.</div>
          ) : (
            driverSchedules.map(({ driver, nextBooking }) => (
              <div key={driver.id} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto]">
                <span className="truncate font-bold text-zinc-800 dark:text-zinc-200">{driver.name}</span>
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">{nextBooking ? formatDateTime(nextBooking.pickupDateTime) : 'No booking'}</span>
              </div>
            ))
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/drivers" className={cn(adminSecondaryButtonClassName, 'inline-flex px-3 py-1.5 text-xs')}>
            View Drivers
          </Link>
          <Link href="/admin/dispatch" className="inline-flex rounded-xl bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white dark:bg-amber-400 dark:text-zinc-950">
            Open Dispatch
          </Link>
        </div>
      </div>
    </AdminPanel>
  );
}

function UpcomingTripsPanel({ bookings }: { bookings: SerializedBooking[] }) {
  return (
    <AdminPanel className="flex min-h-0 min-w-0 flex-col overflow-hidden p-3 xl:p-4">
      <PanelHeader title="Upcoming Trips" subtitle="Pickup-time order, with missing assignments highlighted." />
      <div className="dashboard-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {bookings.length === 0 ? (
          <EmptyState message="No upcoming confirmed or assigned trips." />
        ) : (
          bookings.map((booking) => {
            const missingDriver = !booking.driverId;
            return (
              <div
                key={booking.id}
                className={cn(
                  'grid min-w-0 gap-3 rounded-xl border px-3 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto]',
                  missingDriver
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30'
                    : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900'
                )}
              >
                <div className="min-w-0">
                  <div className="truncate font-bold text-zinc-950 dark:text-white">{booking.pickupLocation} to {booking.dropoffLocation}</div>
                  <div className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {booking.publicBookingId || booking.bookingReference} ·{' '}
                    <span className={missingDriver ? 'font-black text-amber-700 dark:text-amber-300' : ''}>
                      {missingDriver ? 'Unassigned' : getBookingDisplayAssignee(booking)}
                    </span>
                  </div>
                </div>
                <div className="whitespace-nowrap font-semibold text-zinc-700 dark:text-zinc-300">{formatDateTime(booking.pickupDateTime)}</div>
              </div>
            );
          })
        )}
      </div>
    </AdminPanel>
  );
}

function NeedsAssignmentRow({ booking }: { booking: SerializedBooking }) {
  const urgency = getPickupUrgency(booking.pickupDateTime);
  const bookingDisplayId = booking.publicBookingId || booking.bookingReference;
  const route = `${booking.pickupLocation} -> ${booking.dropoffLocation}`;

  return (
    <div className="grid min-w-0 gap-2 bg-white px-3 py-2.5 text-sm transition-colors hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 xl:min-h-[56px] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)_minmax(0,0.75fr)_minmax(0,0.5fr)_minmax(0,0.55fr)_minmax(0,0.55fr)_76px] xl:items-center xl:gap-3">
      <div className="min-w-0 truncate font-black text-zinc-950 dark:text-white" title={bookingDisplayId}>
        {bookingDisplayId}
      </div>
      <div className="min-w-0 truncate font-semibold text-zinc-800 dark:text-zinc-200" title={route}>
        {booking.pickupLocation} &rarr; {booking.dropoffLocation}
      </div>
      <div className="min-w-0">
        <div className="truncate font-semibold text-zinc-700 dark:text-zinc-300">{formatDateTime(booking.pickupDateTime)}</div>
        <div className={cn('mt-0.5 text-xs font-black', urgency.className)}>{urgency.label}</div>
      </div>
      <div className="truncate font-semibold text-zinc-600 dark:text-zinc-400">{getCarTypeDisplay(booking.carType)}</div>
      <div className="truncate font-bold text-zinc-800 dark:text-zinc-200">{booking.fareAmount != null ? formatMoney(booking.fareAmount) : 'Fare pending'}</div>
      <div className="min-w-0">
        <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-bold leading-none', paymentClass(booking.paymentStatus))}>
          {getPaymentStatusLabel(booking.paymentStatus as never)}
        </span>
      </div>
      <Link
        href={`/admin/dispatch?bookingId=${booking.id}`}
        className="inline-flex h-8 items-center justify-center rounded-lg bg-amber-400 px-3 text-xs font-black text-zinc-950 transition-colors hover:bg-amber-300 xl:justify-self-end"
      >
        Assign
      </Link>
    </div>
  );
}

function PanelHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
}: {
  title: string;
  subtitle: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mb-3 flex shrink-0 items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-black text-zinc-950 dark:text-white xl:text-lg">{title}</h2>
        <p className="mt-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 xl:text-sm">{subtitle}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className={cn(adminSecondaryButtonClassName, 'hidden shrink-0 sm:inline-flex')}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function AvailabilityStat({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-3', warning ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40' : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900')}>
      <div className={cn('text-xs font-bold', warning ? 'text-red-700 dark:text-red-200' : 'text-zinc-500 dark:text-zinc-400')}>{label}</div>
      <div className={cn('mt-2 text-2xl font-black', warning ? 'text-red-700 dark:text-red-200' : 'text-zinc-950 dark:text-white')}>{value}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
      {message}
    </div>
  );
}

function statusClass(status: string) {
  if (status === 'ACTIVE') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
  if (status === 'ASSIGNED') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
  return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100';
}

function paymentClass(status: string) {
  if (status === 'PAID') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
  if (status === 'PENDING' || status === 'PARTIAL') return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100';
  if (status === 'REFUNDED') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
  return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100';
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value: string) {
  if (!value) return 'No pickup time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid time';

  return date.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPickupUrgency(value: string) {
  const pickupTime = new Date(value).getTime();
  const hoursUntilPickup = (pickupTime - Date.now()) / (60 * 60 * 1000);

  if (Number.isNaN(pickupTime)) {
    return {
      label: 'No time',
      className: 'text-zinc-500 dark:text-zinc-400',
    };
  }

  if (hoursUntilPickup <= 0) {
    return {
      label: 'Due now',
      className: 'inline-flex rounded-full bg-red-100 px-2 py-0.5 text-red-800 dark:bg-red-900 dark:text-red-100',
    };
  }

  if (hoursUntilPickup < 3) {
    return {
      label: formatTimeToPickup(hoursUntilPickup),
      className: 'text-amber-700 dark:text-amber-300',
    };
  }

  return {
    label: formatTimeToPickup(hoursUntilPickup),
    className: 'text-zinc-500 dark:text-zinc-400',
  };
}

function formatTimeToPickup(hours: number) {
  if (hours <= 0) return 'Due now';
  if (hours < 1) return `${Math.max(Math.round(hours * 60), 1)}m`;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  return `${Math.ceil(hours / 24)}d`;
}

function findNextBookingForDriver(bookings: SerializedBooking[], driverId: string) {
  const now = Date.now();
  return [...bookings]
    .filter((booking) => booking.driverId === driverId && ['ASSIGNED', 'ACTIVE'].includes(booking.status) && new Date(booking.pickupDateTime).getTime() >= now)
    .sort((a, b) => +new Date(a.pickupDateTime) - +new Date(b.pickupDateTime))[0] ?? null;
}
