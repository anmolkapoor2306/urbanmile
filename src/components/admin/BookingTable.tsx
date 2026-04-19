'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BOOKING_STATUSES, getBookingStatusLabel } from '@/lib/dispatch';
import { getBookingDisplayAssignee } from '@/lib/opsDashboard';
import { getCarTypeDisplay } from '@/lib/utils';

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
}

export function BookingTable({ bookings }: { bookings: AdminBooking[] }) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      booking.bookingReference.toLowerCase().includes(query) ||
      booking.fullName.toLowerCase().includes(query) ||
      booking.phone.includes(searchQuery) ||
      booking.pickupLocation.toLowerCase().includes(query) ||
      booking.dropoffLocation.toLowerCase().includes(query) ||
      getBookingDisplayAssignee(booking).toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 p-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            placeholder="Search by booking, customer, phone, route, or assigned driver"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 md:flex-1"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 md:w-[220px]"
          >
            <option value="all">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2">
        {filteredBookings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
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
  const [fareValue, setFareValue] = useState(booking.fareAmount?.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(nextStatus: string) {
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

      router.refresh();
    } catch (error) {
      alert((error as Error).message);
      setSelectedStatus(booking.status);
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

  const parsedFare = fareValue.trim() === '' ? null : Number(fareValue);

  return (
    <article className="w-full rounded-xl border border-zinc-200 bg-white px-6 py-4 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">{toTitleCase(booking.fullName)}</div>
            <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {booking.phone}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{booking.bookingReference}</div>
            <div className="mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {formatDate(booking.createdAt)}
            </div>
          </div>
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Info label="Route" value={`${booking.pickupLocation} → ${booking.dropoffLocation}`} />
          <Info label="Pickup Time" value={`${formatDate(booking.pickupDateTime)} · ${formatTime(booking.pickupDateTime)}`} />
          <Info label="Vehicle Type" value={getCarTypeDisplay(booking.carType)} />
          <Info label="Assigned Driver" value={getBookingDisplayAssignee(booking)} />
          <Info label="Confirmed Fare" value={booking.fareAmount ? formatMoney(booking.fareAmount) : 'Pending'} />
          <Info label="Status" value={getBookingStatusLabel(booking.status as (typeof BOOKING_STATUSES)[number])} />
        </div>

        {booking.specialInstructions ? (
          <div className="rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            Note: {booking.specialInstructions}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[180px_1fr]">
          <label>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-400">Fare</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={fareValue}
              onChange={(event) => setFareValue(event.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>

          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                if (parsedFare === null || Number.isNaN(parsedFare)) {
                  alert('Enter the fare first.');
                  return;
                }

                void updateDispatch({
                  fareAmount: parsedFare,
                  status: booking.status === 'NEW' ? 'CONFIRMED' : booking.status,
                });
              }}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
            >
              {booking.status === 'NEW' ? 'Confirm + Fare' : 'Save Fare'}
            </button>

            <Link
              href="/admin/dispatch"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Assign
            </Link>

            {booking.status === 'ASSIGNED' ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void updateStatus('IN_PROGRESS')}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Start
              </button>
            ) : null}

            {booking.status === 'IN_PROGRESS' ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void updateStatus('COMPLETED')}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
              >
                Complete
              </button>
            ) : null}

            {booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void updateStatus('CANCELLED')}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/40"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            value={selectedStatus}
            onChange={(event) => void updateStatus(event.target.value)}
            disabled={isSaving}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getBookingStatusLabel(status)}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={isDeleting}
            onClick={() => void handleDelete()}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{value}</div>
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}
