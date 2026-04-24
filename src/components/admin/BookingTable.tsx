'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminInputClassName, adminInsetClassName, adminSecondaryButtonClassName } from '@/components/admin/AdminLayout';
import type { BookingStatusValue } from '@/lib/dispatch';
import { getBookingDisplayAssignee } from '@/lib/opsDashboard';
import { cn } from '@/lib/utils';

export interface AdminBooking {
  id: string;
  bookingReference: string;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  carType: string;
  specialInstructions: string | null;
  status: string;
  fareAmount?: number | null;
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID';
  assignmentType?: 'OWN_DRIVER' | 'OUTSOURCED_DRIVER' | 'MANUAL_OUTSOURCED' | null;
  driver?: {
    id: string;
    name: string;
  } | null;
  vendor?: {
    id: string;
    name: string;
  } | null;
  manualVendorName?: string | null;
  manualDriverName?: string | null;
  createdAt: string;
  archivedAt?: string | null;
}

const vehicleTypeOptions: Array<{ value: string; label: string }> = [
  { value: 'SEDAN', label: 'Sedan' },
  { value: 'SUV', label: 'MUV / SUV' },
  { value: 'VAN', label: 'Large Vehicle' },
  { value: 'LUXURY', label: 'Premium Vehicle' },
];

const STATUS_PILLS: Array<{
  value: BookingStatusValue;
  label: string;
  activeClassName: string;
  inactiveClassName: string;
}> = [
  {
    value: 'NEW',
    label: 'New/Unassigned',
    activeClassName: 'bg-amber-500 text-white dark:bg-amber-600',
    inactiveClassName: 'border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900',
  },
  {
    value: 'CONFIRMED',
    label: 'Confirmed',
    activeClassName: 'bg-blue-500 text-white dark:bg-blue-600',
    inactiveClassName: 'border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900',
  },
  {
    value: 'ASSIGNED',
    label: 'Assigned',
    activeClassName: 'bg-violet-500 text-white dark:bg-violet-600',
    inactiveClassName: 'border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900',
  },
  {
    value: 'ACTIVE',
    label: 'Active',
    activeClassName: 'bg-cyan-600 text-white border-cyan-600',
    inactiveClassName: 'border border-cyan-500 text-cyan-400',
  },
  {
    value: 'COMPLETED',
    label: 'Complete',
    activeClassName: 'bg-green-500 text-white dark:bg-green-600',
    inactiveClassName: 'border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900',
  },
  {
    value: 'CANCELLED',
    label: 'Cancelled',
    activeClassName: 'bg-red-500 text-white dark:bg-red-600',
    inactiveClassName: 'border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900',
  },
];

const statusPillBaseClassName =
  'inline-flex min-h-9 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold leading-none transition-colors disabled:opacity-60';

export function BookingTable({ bookings }: { bookings: AdminBooking[] }) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pickupDateSort, setPickupDateSort] = useState<'newest' | 'oldest'>('oldest');
  const [showArchived, setShowArchived] = useState(false);

  const filteredBookings = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return [...bookings]
      .filter((booking) => {
        const matchesArchive = showArchived ? booking.archivedAt !== null : booking.archivedAt === null;
        const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;

        const matchesSearch =
          booking.bookingReference.toLowerCase().includes(query) ||
          booking.fullName.toLowerCase().includes(query) ||
          booking.phone.includes(searchQuery) ||
          booking.pickupLocation.toLowerCase().includes(query) ||
          booking.dropoffLocation.toLowerCase().includes(query) ||
          getBookingDisplayAssignee(booking).toLowerCase().includes(query);

        return matchesArchive && matchesStatus && matchesSearch;
      })
      .sort((left, right) => {
        const leftPickup = getPickupDateTimeValue(left.pickupDateTime);
        const rightPickup = getPickupDateTimeValue(right.pickupDateTime);

        return pickupDateSort === 'newest' ? rightPickup - leftPickup : leftPickup - rightPickup;
      });
  }, [bookings, filterStatus, pickupDateSort, searchQuery, showArchived]);

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <div className={cn(adminInsetClassName, 'shrink-0 p-4')}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Search by booking, customer, phone, route, or assigned driver"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(adminInputClassName, 'md:flex-1')}
          />
          <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={cn(adminInputClassName, 'md:w-[220px]')}
            >
              <option value="all">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

              <select
                value={pickupDateSort}
                onChange={(e) => setPickupDateSort(e.target.value as 'newest' | 'oldest')}
                className={cn(adminInputClassName, 'md:w-[240px]')}
              >
                <option value="oldest">Earliest First</option>
                <option value="newest">Latest First</option>
              </select>
            
            <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-950 p-1">
              <button
                type="button"
                                onClick={() => setShowArchived(false)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  !showArchived
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                )}
              >
                Active
              </button>
              <button
                type="button"
                                onClick={() => setShowArchived(true)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  showArchived
                    ? 'bg-zinc-100 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                )}
              >
                Archived
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-zinc-500">
          {filteredBookings.length} {showArchived ? 'archived' : 'active'} booking{filteredBookings.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="dashboard-scrollbar mt-4 flex-1 min-h-0 overflow-y-auto pr-1">
        {filteredBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 px-6 py-10 text-center text-sm text-zinc-500">
            No bookings found
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: AdminBooking }) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState(booking.status);
  const [selectedCarType, setSelectedCarType] = useState(booking.carType);
  const [fareValue, setFareValue] = useState(booking.fareAmount?.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [archiveState, setArchiveState] = useState<{
    previousStatus: string;
    nextStatus: 'COMPLETED' | 'CANCELLED';
  } | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  function clearArchiveTimers() {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }

  async function updateDispatch(payload: Record<string, unknown>) {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/dispatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking');
      }

      router.refresh();
      return true;
    } catch (error) {
      alert((error as Error).message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(nextStatus: string) {
    if (nextStatus === 'CANCELLED' && !confirm('Cancel this booking and move it to archive?')) {
      return;
    }

    const previousStatus = selectedStatus;
    setSelectedStatus(nextStatus);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking status');
      }

      if (nextStatus === 'COMPLETED' || nextStatus === 'CANCELLED') {
        clearArchiveTimers();
        setArchiveState({ previousStatus, nextStatus });
        setIsFadingOut(false);

        fadeTimerRef.current = setTimeout(() => {
          setIsFadingOut(true);
        }, 2400);

        hideTimerRef.current = setTimeout(() => {
          setIsHidden(true);
          router.refresh();
        }, 2900);
        return;
      }

      setArchiveState(null);
      setIsFadingOut(false);
      router.refresh();
    } catch (error) {
      alert((error as Error).message);
      setSelectedStatus(previousStatus);
    } finally {
      setIsSaving(false);
    }
  }

  async function undoArchive() {
    if (!archiveState) return;

    clearArchiveTimers();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: archiveState.previousStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore booking');
      }

      setSelectedStatus(archiveState.previousStatus);
      setArchiveState(null);
      setIsFadingOut(false);
      router.refresh();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this booking?')) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete booking');
      }
      router.refresh();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function updateCarType(nextCarType: string) {
    const previousCarType = selectedCarType;
    setSelectedCarType(nextCarType);

    const success = await updateDispatch({ carType: nextCarType });
    if (!success) {
      setSelectedCarType(previousCarType);
    }
  }

  async function saveFare() {
    if (parsedFare === null || Number.isNaN(parsedFare)) {
      alert('Enter the fare first.');
      return;
    }

    await updateDispatch({
      fareAmount: parsedFare,
      status: booking.status === 'NEW' ? 'CONFIRMED' : booking.status,
    });
  }

  const parsedFare = fareValue.trim() === '' ? null : Number(fareValue);

  if (isHidden) {
    return null;
  }

  return (
    <article className={cn(
      'w-full rounded-2xl border border-zinc-800 bg-zinc-950/70 px-6 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.18)] transition-all duration-500 hover:border-zinc-700',
      isFadingOut && 'pointer-events-none -translate-y-2 opacity-0'
    )}>
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-start">
          <div className="min-w-0 xl:justify-self-start">
            <div className="text-base font-bold text-zinc-100">{toTitleCase(booking.fullName)}</div>
            <div className="mt-1 text-sm text-zinc-500">
              {booking.phone}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 xl:self-start">
            {STATUS_PILLS.map((statusPill) => {
              const isActive = selectedStatus === statusPill.value;

              return (
                <button
                  key={statusPill.value}
                  type="button"
                  disabled={isSaving}
                  onClick={() => void updateStatus(statusPill.value)}
                  className={cn(
                    statusPillBaseClassName,
                    isActive ? statusPill.activeClassName : statusPill.inactiveClassName
                  )}
                >
                  {statusPill.label}
                </button>
              );
            })}
          </div>

          <div className="text-left xl:justify-self-end xl:self-start xl:text-right">
            <div className="text-sm font-semibold text-zinc-100">{booking.bookingReference}</div>
            <div className="mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-500">
              {formatDate(booking.createdAt)}
            </div>
          </div>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Info label="Route" value={`${booking.pickupLocation} → ${booking.dropoffLocation}`} />
          <Info label="Pickup" value={formatPickupDateTimeDisplay(booking.pickupDateTime)} />
          <label>
            <span className="text-xs uppercase tracking-wide text-zinc-500">Vehicle Type</span>
            <select
              value={selectedCarType}
              onChange={(event) => void updateCarType(event.target.value)}
              disabled={isSaving}
              className="mt-1 w-full max-w-[190px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {vehicleTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Info label="Assigned Driver" value={getBookingDisplayAssignee(booking)} />
        </div>

        {booking.specialInstructions ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-500">
            Note: {booking.specialInstructions}
          </div>
        ) : null}

        {archiveState ? (
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 sm:flex-row sm:items-center sm:justify-between">
            <span>Moved to archive.</span>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void undoArchive()}
              className="shrink-0 rounded-xl border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/10 disabled:opacity-60"
            >
              Undo
            </button>
          </div>
        ) : null}

        <div className="border-t border-zinc-800 pt-4">
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,220px)_auto] sm:items-center sm:justify-between">
            <label className="block max-w-[220px]">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Fare</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fareValue}
                onChange={(event) => setFareValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void saveFare();
                  }
                }}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </label>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="justify-self-end rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>

            <div className="text-xs text-zinc-500 sm:col-start-1">Press Enter to save fare changes.</div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-sm text-zinc-200">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPickupDateTimeValue(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatPickupDateTimeDisplay(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  const time = parsedDate.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();

  const date = parsedDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `${time} - ${date}`;
}

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
