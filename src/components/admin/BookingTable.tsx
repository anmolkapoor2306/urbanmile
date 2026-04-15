'use client';

import { useState, useCallback } from 'react';
import { cn, getCarTypeDisplay, getStatusColor } from '@/lib/utils';

export interface AdminBooking {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  dropoffLocation: string;
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
      booking.fullName.toLowerCase().includes(searchLower) ||
      booking.email.toLowerCase().includes(searchLower) ||
      booking.phone.includes(searchQuery) ||
      booking.pickupLocation.toLowerCase().includes(searchLower) ||
      booking.dropoffLocation.toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search bookings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Route
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Pickup
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-zinc-800 divide-y divide-zinc-200 dark:divide-zinc-700">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                  No bookings found
                </td>
              </tr>
            ) : (
              filteredBookings.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BookingRow({ booking }: { booking: AdminBooking }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(booking.status);

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
      }
    } catch {
      alert('Network error');
      setSelectedStatus(booking.status);
    } finally {
      setTimeout(() => setIsUpdating(false), 1000);
    }
  };

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-700">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {booking.pickupLocation}
          <span className="mx-2 text-zinc-400">→</span>
          {booking.dropoffLocation}
        </div>
        {booking.specialInstructions && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
            {booking.specialInstructions}
          </div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {booking.fullName}
        </div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">{booking.email}</div>
        <div className="text-sm text-zinc-500 dark:text-zinc-400">{booking.phone}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-700 dark:text-zinc-300">
        {getCarTypeDisplay(booking.carType)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-zinc-700 dark:text-zinc-300">
          {new Date(booking.pickupDateTime).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {new Date(booking.pickupDateTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
            getStatusColor(booking.status)
          )}
        >
          {booking.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <select
          value={selectedStatus}
          onChange={handleStatusChange}
          disabled={isUpdating}
          className={cn(
            'px-2 py-1 rounded text-xs font-medium border',
            'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600',
            'text-zinc-900 dark:text-zinc-100',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500'
          )}
        >
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </td>
    </tr>
  );
}
