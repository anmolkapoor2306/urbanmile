'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminPanel, adminInputClassName, adminSecondaryButtonClassName } from '@/components/admin/AdminLayout';
import type { SerializedBooking } from '@/lib/bookingRecord';
import type { SerializedDriver } from '@/lib/driverRecord';
import { getDriverTypeLabel } from '@/lib/dispatch';
import { getBookingDisplayAssignee } from '@/lib/opsDashboard';
import { cn, getCarTypeDisplay } from '@/lib/utils';

type QueueFilter = 'ALL' | 'SEDAN' | 'SUV' | 'TODAY' | 'TOMORROW';

export function DispatchBoard({
  drivers,
  bookings,
}: {
  drivers: SerializedDriver[];
  bookings: SerializedBooking[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBookingId = searchParams.get('bookingId') ?? searchParams.get('booking');
  const [filter, setFilter] = useState<QueueFilter>('ALL');
  const [driverSearch, setDriverSearch] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(initialBookingId);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const needsAssignment = useMemo(
    () =>
      bookings
        .filter((booking) => booking.status === 'CONFIRMED' && !booking.driverId && !booking.vendorId && !booking.manualDriverName)
        .filter((booking) => matchesQueueFilter(booking, filter))
        .sort((a, b) => +new Date(a.pickupDateTime) - +new Date(b.pickupDateTime)),
    [bookings, filter]
  );

  const selectedBooking = selectedBookingId
    ? bookings.find((booking) => booking.id === selectedBookingId) ?? null
    : null;
  const selectedDriver = selectedDriverId
    ? drivers.find((driver) => driver.id === selectedDriverId) ?? null
    : null;

  const driverRows = useMemo(() => {
    const query = driverSearch.trim().toLowerCase();

    return drivers
      .filter((driver) => {
        if (!query) return true;
        return (
          driver.name.toLowerCase().includes(query) ||
          driver.phone.includes(driverSearch) ||
          (driver.driverCode || '').toLowerCase().includes(query)
        );
      })
      .map((driver) => ({
        driver,
        nextBooking: findNextBookingForDriver(bookings, driver.id),
        activeTrip: bookings.find((booking) => booking.driverId === driver.id && booking.status === 'ACTIVE') ?? null,
        assignedTrip: bookings.find((booking) => booking.driverId === driver.id && booking.status === 'ASSIGNED') ?? null,
        hasConflict: selectedBooking ? hasDriverConflict(bookings, driver.id, selectedBooking) : false,
      }))
      .sort((a, b) => Number(isDriverSelectable(b.driver, b.activeTrip, b.assignedTrip, b.hasConflict)) - Number(isDriverSelectable(a.driver, a.activeTrip, a.assignedTrip, a.hasConflict)) || a.driver.name.localeCompare(b.driver.name));
  }, [bookings, driverSearch, drivers, selectedBooking]);

  const selectedDriverRow = selectedDriver
    ? driverRows.find((row) => row.driver.id === selectedDriver.id) ?? null
    : null;
  const canAssign = Boolean(
    selectedBooking &&
      selectedDriver &&
      selectedDriverRow &&
      isDriverSelectable(selectedDriverRow.driver, selectedDriverRow.activeTrip, selectedDriverRow.assignedTrip, selectedDriverRow.hasConflict)
  );

  async function updateBooking(booking: SerializedBooking, payload: Record<string, unknown>, successMessage: string) {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/dispatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not update trip.');
      }

      setMessage(successMessage);
      setSelectedBookingId(null);
      setSelectedDriverId(null);
      router.refresh();
    } catch (error) {
      setMessage((error as Error).message || 'Could not update trip.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Dispatch</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Assign controlled drivers, avoid conflicts, and move trips through the live workflow.
        </p>
      </div>

      {message ? (
        <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {message}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[0.95fr_1.1fr_0.95fr]">
        <AdminPanel className="flex min-h-0 flex-col overflow-hidden p-4">
          <PanelTitle title="Needs Assignment" subtitle="Confirmed bookings waiting for a driver." count={needsAssignment.length} />
          <div className="mb-4 flex flex-wrap gap-2">
            {(['ALL', 'SEDAN', 'SUV', 'TODAY', 'TOMORROW'] as QueueFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                  filter === item
                    ? 'border-zinc-950 bg-zinc-950 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-zinc-950'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-600'
                )}
              >
                {filterLabel(item)}
              </button>
            ))}
          </div>
          <div className="dashboard-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {needsAssignment.length === 0 ? (
              <EmptyState message="No bookings need assignment for this filter." />
            ) : (
              needsAssignment.map((booking) => (
                <BookingQueueCard
                  key={booking.id}
                  booking={booking}
                  isSelected={selectedBookingId === booking.id}
                  onSelect={() => setSelectedBookingId(selectedBookingId === booking.id ? null : booking.id)}
                />
              ))
            )}
          </div>
        </AdminPanel>

        <AdminPanel className="flex min-h-0 flex-col overflow-hidden p-4">
          <PanelTitle title="Assignment Control" subtitle="Select one booking and one eligible driver." />
          <div className="dashboard-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
            <SelectionCard title="Selected Booking">
              {selectedBooking ? <BookingDetails booking={selectedBooking} /> : <EmptyState message="Select a booking from the queue." compact />}
            </SelectionCard>
            <SelectionCard title="Selected Driver">
              {selectedDriver ? (
                <DriverDetails
                  driver={selectedDriver}
                  nextBooking={selectedDriverRow?.nextBooking ?? null}
                  disabledReason={selectedDriverRow ? getDriverDisabledReason(selectedDriverRow.driver, selectedDriverRow.activeTrip, selectedDriverRow.assignedTrip, selectedDriverRow.hasConflict) : null}
                />
              ) : (
                <EmptyState message="Select an available driver." compact />
              )}
            </SelectionCard>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Actions</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!canAssign || isSaving || !selectedBooking || !selectedDriver}
                  onClick={() => selectedBooking && selectedDriver && void updateBooking(selectedBooking, { driverId: selectedDriver.id, status: 'ASSIGNED' }, 'Driver assigned.')}
                  className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                >
                  Assign Trip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBookingId(null);
                    setSelectedDriverId(null);
                    setMessage(null);
                  }}
                  className={adminSecondaryButtonClassName}
                >
                  Clear Selection
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <LifecycleButton
                  disabled={!selectedBooking || selectedBooking.status !== 'ASSIGNED' || isSaving}
                  onClick={() => selectedBooking && void updateBooking(selectedBooking, { status: 'ACTIVE' }, 'Trip started.')}
                >
                  Start Trip
                </LifecycleButton>
                <LifecycleButton
                  disabled={!selectedBooking || selectedBooking.status !== 'ACTIVE' || isSaving}
                  onClick={() => selectedBooking && void updateBooking(selectedBooking, { status: 'COMPLETED' }, 'Trip completed.')}
                >
                  Mark Complete
                </LifecycleButton>
                <LifecycleButton
                  disabled={!selectedBooking || isSaving || selectedBooking.status === 'COMPLETED' || selectedBooking.status === 'CANCELLED'}
                  onClick={() => selectedBooking && confirm('Cancel this trip?') && void updateBooking(selectedBooking, { status: 'CANCELLED' }, 'Trip cancelled.')}
                >
                  Cancel Trip
                </LifecycleButton>
              </div>
            </div>
          </div>
        </AdminPanel>

        <AdminPanel className="flex min-h-0 flex-col overflow-hidden p-4">
          <PanelTitle title="Drivers" subtitle="Unavailable drivers are locked from assignment." count={driverRows.length} />
          <input
            value={driverSearch}
            onChange={(event) => setDriverSearch(event.target.value)}
            className={cn(adminInputClassName, 'mb-4')}
            placeholder="Search driver, phone, or code"
          />
          <div className="dashboard-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {driverRows.length === 0 ? (
              <EmptyState message="No drivers match the search." />
            ) : (
              driverRows.map((row) => {
                const disabledReason = getDriverDisabledReason(row.driver, row.activeTrip, row.assignedTrip, row.hasConflict);
                return (
                  <DriverCard
                    key={row.driver.id}
                    row={row}
                    disabledReason={disabledReason}
                    isSelected={selectedDriverId === row.driver.id}
                    onSelect={() => {
                      if (disabledReason) return;
                      setSelectedDriverId(selectedDriverId === row.driver.id ? null : row.driver.id);
                    }}
                  />
                );
              })
            )}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}

function BookingQueueCard({
  booking,
  isSelected,
  onSelect,
}: {
  booking: SerializedBooking;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-2xl border p-4 text-left transition-colors',
        isSelected
          ? 'border-zinc-950 bg-zinc-950 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-zinc-950'
          : 'border-zinc-200 bg-zinc-50 text-zinc-950 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600'
      )}
    >
      <div className="text-sm font-black">{booking.publicBookingId || booking.bookingReference}</div>
      <div className={cn('mt-2 text-sm', isSelected ? 'opacity-90' : 'text-zinc-600 dark:text-zinc-400')}>
        {booking.pickupLocation} to {booking.dropoffLocation}
      </div>
      <div className={cn('mt-2 text-xs font-semibold', isSelected ? 'opacity-80' : 'text-zinc-500 dark:text-zinc-400')}>
        {booking.fullName} · {formatDateTime(booking.pickupDateTime)} · {getCarTypeDisplay(booking.carType)}
      </div>
      <div className={cn('mt-2 text-xs font-bold', isSelected ? 'opacity-90' : 'text-zinc-600 dark:text-zinc-300')}>
        {booking.fareAmount ? formatMoney(booking.fareAmount) : 'Fare pending'}
      </div>
    </button>
  );
}

function DriverCard({
  row,
  disabledReason,
  isSelected,
  onSelect,
}: {
  row: {
    driver: SerializedDriver;
    nextBooking: SerializedBooking | null;
  };
  disabledReason: string | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={Boolean(disabledReason)}
      className={cn(
        'w-full rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        isSelected
          ? 'border-zinc-950 bg-zinc-950 text-white dark:border-amber-400 dark:bg-amber-400 dark:text-zinc-950'
          : 'border-zinc-200 bg-zinc-50 text-zinc-950 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-600'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{row.driver.name}</div>
          <div className={cn('mt-1 text-xs font-semibold', isSelected ? 'opacity-80' : 'text-zinc-500 dark:text-zinc-400')}>
            {row.driver.driverCode || 'DRV-0000'} · {getDriverTypeLabel(row.driver.driverType as never)}
          </div>
          <div className={cn('mt-1 text-xs', isSelected ? 'opacity-80' : 'text-zinc-500 dark:text-zinc-400')}>
            {row.driver.phone}
          </div>
        </div>
        <span className={cn('rounded-full px-2 py-1 text-xs font-bold', driverStatusClass(row.driver))}>
          {driverStatusLabel(row.driver)}
        </span>
      </div>
      <div className={cn('mt-3 text-xs', isSelected ? 'opacity-80' : 'text-zinc-500 dark:text-zinc-400')}>
        Next booking: {row.nextBooking ? formatDateTime(row.nextBooking.pickupDateTime) : 'None scheduled'}
      </div>
      {disabledReason ? <div className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">{disabledReason}</div> : null}
    </button>
  );
}

function BookingDetails({ booking }: { booking: SerializedBooking }) {
  return (
    <div className="space-y-2 text-sm">
      <Detail label="Booking" value={booking.publicBookingId || booking.bookingReference} />
      <Detail label="Customer" value={`${booking.fullName} · ${booking.phone}`} />
      <Detail label="Route" value={`${booking.pickupLocation} to ${booking.dropoffLocation}`} />
      <Detail label="Pickup" value={formatDateTime(booking.pickupDateTime)} />
      <Detail label="Vehicle / Fare" value={`${getCarTypeDisplay(booking.carType)} · ${booking.fareAmount ? formatMoney(booking.fareAmount) : 'Fare pending'}`} />
      <Detail label="Current Assignee" value={getBookingDisplayAssignee(booking)} />
    </div>
  );
}

function DriverDetails({
  driver,
  nextBooking,
  disabledReason,
}: {
  driver: SerializedDriver;
  nextBooking: SerializedBooking | null;
  disabledReason: string | null;
}) {
  return (
    <div className="space-y-2 text-sm">
      <Detail label="Driver" value={`${driver.driverCode || 'DRV-0000'} · ${driver.name}`} />
      <Detail label="Phone" value={driver.phone} />
      <Detail label="Type" value={getDriverTypeLabel(driver.driverType as never)} />
      <Detail label="Status" value={driverStatusLabel(driver)} />
      <Detail label="Next Booking" value={nextBooking ? formatDateTime(nextBooking.pickupDateTime) : 'None scheduled'} />
      {disabledReason ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{disabledReason}</div> : null}
    </div>
  );
}

function SelectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{title}</div>
      {children}
    </div>
  );
}

function PanelTitle({ title, subtitle, count }: { title: string; subtitle: string; count?: number }) {
  return (
    <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-zinc-950 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      </div>
      {typeof count === 'number' ? <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{count}</span> : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 font-semibold text-zinc-950 dark:text-zinc-100">{value}</div>
    </div>
  );
}

function LifecycleButton({ children, disabled, onClick }: { children: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-800 transition-colors hover:border-zinc-950 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-500"
    >
      {children}
    </button>
  );
}

function EmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-zinc-300 bg-white text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400', compact ? 'px-3 py-4' : 'px-4 py-8')}>
      {message}
    </div>
  );
}

function matchesQueueFilter(booking: SerializedBooking, filter: QueueFilter) {
  if (filter === 'SEDAN') return booking.carType === 'SEDAN';
  if (filter === 'SUV') return booking.carType === 'SUV';
  if (filter === 'TODAY') return isSameCalendarDay(new Date(booking.pickupDateTime), new Date());
  if (filter === 'TOMORROW') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return isSameCalendarDay(new Date(booking.pickupDateTime), tomorrow);
  }
  return true;
}

function filterLabel(filter: QueueFilter) {
  const labels: Record<QueueFilter, string> = {
    ALL: 'All',
    SEDAN: 'Sedan',
    SUV: 'SUV',
    TODAY: 'Today',
    TOMORROW: 'Tomorrow',
  };
  return labels[filter];
}

function isDriverSelectable(
  driver: SerializedDriver,
  activeTrip: SerializedBooking | null,
  assignedTrip: SerializedBooking | null,
  hasConflict: boolean
) {
  return !getDriverDisabledReason(driver, activeTrip, assignedTrip, hasConflict);
}

function getDriverDisabledReason(
  driver: SerializedDriver,
  activeTrip: SerializedBooking | null,
  assignedTrip: SerializedBooking | null,
  hasConflict: boolean
) {
  if (!driver.isActive || driver.availabilityStatus === 'OFFLINE') return 'Off duty';
  if (activeTrip) return 'On trip';
  if (assignedTrip) return 'Already assigned';
  if (driver.availabilityStatus !== 'AVAILABLE') return 'Not available';
  if (hasConflict) return 'Pickup conflict';
  return null;
}

function hasDriverConflict(bookings: SerializedBooking[], driverId: string, targetBooking: SerializedBooking) {
  const target = new Date(targetBooking.pickupDateTime).getTime();
  const conflictWindowMs = 4 * 60 * 60 * 1000;

  return bookings.some((booking) => {
    if (booking.id === targetBooking.id || booking.driverId !== driverId) return false;
    if (!['ASSIGNED', 'ACTIVE'].includes(booking.status)) return false;
    return Math.abs(new Date(booking.pickupDateTime).getTime() - target) < conflictWindowMs;
  });
}

function findNextBookingForDriver(bookings: SerializedBooking[], driverId: string) {
  const now = Date.now();
  return [...bookings]
    .filter((booking) => booking.driverId === driverId && ['ASSIGNED', 'ACTIVE'].includes(booking.status) && new Date(booking.pickupDateTime).getTime() >= now)
    .sort((a, b) => +new Date(a.pickupDateTime) - +new Date(b.pickupDateTime))[0] ?? null;
}

function driverStatusLabel(driver: SerializedDriver) {
  if (!driver.isActive || driver.availabilityStatus === 'OFFLINE') return 'Off Duty';
  if (driver.availabilityStatus === 'BUSY') return 'Assigned';
  return 'Available';
}

function driverStatusClass(driver: SerializedDriver) {
  if (!driver.isActive || driver.availabilityStatus === 'OFFLINE') return 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  if (driver.availabilityStatus === 'BUSY') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
  return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
}

function isSameCalendarDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
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
