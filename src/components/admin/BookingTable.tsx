'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn, getCarTypeDisplay, getStatusColor } from '@/lib/utils';

export interface AdminBooking {
  id: string;
  bookingReference: string;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  dropoffLocation: string;
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  pickupDateTime: string;
  carType: string;
  specialInstructions: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function BookingTable({ bookings }: { bookings: AdminBooking[] }) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;
    const searchLower = searchQuery.toLowerCase();

    const matchesSearch =
      booking.bookingReference.toLowerCase().includes(searchLower) ||
      booking.fullName.toLowerCase().includes(searchLower) ||
      booking.email.toLowerCase().includes(searchLower) ||
      booking.phone.includes(searchQuery) ||
      booking.pickupLocation.toLowerCase().includes(searchLower) ||
      booking.dropoffLocation.toLowerCase().includes(searchLower);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          type="text"
          placeholder="Search by booking, customer, phone, or route"
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
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] table-fixed divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-zinc-900/80">
              <tr>
                <HeaderCell className="w-[140px]">Booking</HeaderCell>
                <HeaderCell className="w-[300px]">Route</HeaderCell>
                <HeaderCell className="w-[220px]">Customer</HeaderCell>
                <HeaderCell className="w-[140px]">Pickup</HeaderCell>
                <HeaderCell className="w-[110px]">Vehicle</HeaderCell>
                <HeaderCell className="w-[120px]">Status</HeaderCell>
                <HeaderCell className="w-[150px]">Actions</HeaderCell>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-700 dark:bg-zinc-800">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => <BookingRow key={booking.id} booking={booking} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HeaderCell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400', className)}>
      {children}
    </th>
  );
}

function BookingRow({ booking }: { booking: AdminBooking }) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(booking.status);
  const [isDeleting, setIsDeleting] = useState(false);

  const routeLinks = buildGoogleMapsLinks(booking);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setSelectedStatus(newStatus);
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to update status');
        setSelectedStatus(booking.status);
      } else {
        router.refresh();
      }
    } catch {
      alert('Network error');
      setSelectedStatus(booking.status);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = async () => {
    const confirmDelete = confirm('Are you sure you want to delete this booking?');
    if (!confirmDelete) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete booking');
      }

      router.refresh();
    } catch (err) {
      alert('Failed to delete booking: ' + (err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <tr className="align-top transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
      <td className="px-4 py-4">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{booking.bookingReference}</div>
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Created {formatDate(booking.createdAt)}
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="space-y-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Pickup</div>
            <LocationLink href={routeLinks.pickupHref} label={booking.pickupLocation} />
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Dropoff</div>
            <LocationLink href={routeLinks.dropoffHref} label={booking.dropoffLocation} />
          </div>
          {(routeLinks.routeHref || booking.specialInstructions) && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {routeLinks.routeHref && (
                <a
                  href={routeLinks.routeHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-xs font-medium text-amber-600 transition-colors hover:text-amber-500 dark:text-amber-400"
                >
                  Open Route
                </a>
              )}
              {booking.specialInstructions && (
                <span className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {booking.specialInstructions}
                </span>
              )}
            </div>
          )}
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="space-y-1">
          <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100" title={booking.fullName}>
            {booking.fullName}
          </div>
          <div className="truncate text-sm text-zinc-500 dark:text-zinc-400" title={booking.email}>
            {booking.email}
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">{booking.phone}</div>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{formatDate(booking.pickupDateTime)}</div>
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{formatTime(booking.pickupDateTime)}</div>
      </td>

      <td className="px-4 py-4 text-sm text-zinc-700 dark:text-zinc-300">
        {getCarTypeDisplay(booking.carType)}
      </td>

      <td className="px-4 py-4">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
            getStatusColor(booking.status)
          )}
        >
          {booking.status}
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="flex flex-col items-stretch gap-2">
          <select
            value={selectedStatus}
            onChange={handleStatusChange}
            disabled={isUpdating}
            className={cn(
              'w-full rounded-lg border px-3 py-2 text-xs font-medium',
              'bg-white text-zinc-900 border-zinc-300',
              'focus:outline-none focus:ring-2 focus:ring-amber-500',
              'dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-600',
              isUpdating && 'opacity-70'
            )}
          >
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {isDeleting ? 'Deleting...' : 'Delete Booking'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function LocationLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return <div className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{label}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-1 block text-sm font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-amber-600 hover:decoration-amber-500 dark:text-zinc-100 dark:decoration-zinc-600 dark:hover:text-amber-400"
      title="Open in Google Maps"
    >
      {label}
    </a>
  );
}

function buildGoogleMapsLinks(booking: AdminBooking) {
  const pickupTarget = getLocationTarget(booking.pickupLocation, booking.pickupLatitude, booking.pickupLongitude);
  const dropoffTarget = getLocationTarget(booking.dropoffLocation, booking.dropoffLatitude, booking.dropoffLongitude);

  return {
    pickupHref: pickupTarget ? createPlaceHref(pickupTarget) : null,
    dropoffHref: dropoffTarget ? createPlaceHref(dropoffTarget) : null,
    routeHref: pickupTarget && dropoffTarget ? createDirectionsHref(pickupTarget, dropoffTarget) : null,
  };
}

function getLocationTarget(label: string, latitude?: number | null, longitude?: number | null) {
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return `${latitude},${longitude}`;
  }

  const parsedCoordinates = parseCoordinatesFromLabel(label);
  if (parsedCoordinates) {
    return `${parsedCoordinates.latitude},${parsedCoordinates.longitude}`;
  }

  const trimmedLabel = label.trim();
  return trimmedLabel.length > 0 ? trimmedLabel : null;
}

function parseCoordinatesFromLabel(label: string) {
  const match = label.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function createPlaceHref(target: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
}

function createDirectionsHref(origin: string, destination: string) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
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
