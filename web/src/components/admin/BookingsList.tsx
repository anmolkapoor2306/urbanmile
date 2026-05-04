'use client'

import { useState } from 'react'
import StatusButtons from './StatusButtons'
import { EditableVehiculeTypeSelect } from './EditableVehiculeTypeSelect'
import { getBookingDisplayAssignee } from '@/lib/opsDashboard'
import { formatDate, formatTime } from '@/lib/utils'
import type { SerializedBooking } from '@/lib/bookingRecord'
import type { BookingStatusValue } from '@/lib/dispatch'

export default function BookingsList({ initialBookings }: { initialBookings: SerializedBooking[] }) {
  const [bookings] = useState(initialBookings)
  const [fadingIds, setFadingIds] = useState(new Set<string>())
  const [hiddenIds, setHiddenIds] = useState(new Set<string>())

  const handleStatusChange = (bookingId: string, status: BookingStatusValue) => {
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      setFadingIds(prev => new Set(prev).add(bookingId))
      setTimeout(() => {
        setHiddenIds(prev => new Set(prev).add(bookingId))
      }, 3000)
    }
  }

  return (
    <div className="space-y-3">
      {bookings
        .filter(booking => booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED')
        .map(booking => {
          if (hiddenIds.has(booking.id)) return null

          return (
            <article
              key={booking.id}
              className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all duration-[3000ms] dark:border-zinc-700 dark:bg-zinc-800 ${
                fadingIds.has(booking.id)
                  ? 'opacity-0 -translate-y-2 pointer-events-none'
                  : 'opacity-100'
              }`}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">{booking.customerName || booking.fullName}</div>
                    <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{booking.customerPhone || booking.phone}</div>
                    {booking.customerEmail && (
                      <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{booking.customerEmail}</div>
                    )}
                    {booking.customerPublicId && (
                      <div className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
                        Customer {booking.customerPublicId}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex justify-center items-start">
                    <StatusButtons
                      bookingId={booking.id}
                      currentStatus={booking.status}
                      onStatusChange={(newStatus) => handleStatusChange(booking.id, newStatus)}
                    />
                  </div>

                  <div className="flex-1 flex flex-col items-end">
                    <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">{booking.publicBookingId || booking.bookingReference}</div>
                    <div className="mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {formatDate(new Date(booking.pickupDateTime))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-300">Route</div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      {booking.pickupLocation} → {booking.dropoffLocation}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-300">Pickup</div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      {formatDate(new Date(booking.pickupDateTime))} • {formatTime(new Date(booking.pickupDateTime))}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-300">Vehicle</div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      <EditableVehiculeTypeSelect
                        carType={booking.carType}
                        bookingId={booking.id}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-300">Assigned To</div>
                    <div className="text-zinc-600 dark:text-zinc-400">
                      {getBookingDisplayAssignee(booking)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-300">Fare</div>
                    <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">₹{booking.fareAmount || '0'}</div>
                  </div>
                  <div>
                    <div className="font-medium text-zinc-700 dark:text-zinc-300">Payment</div>
                    <div className="text-zinc-600 dark:text-zinc-400">{booking.paymentStatus || 'Unpaid'}</div>
                  </div>
                </div>


				
				{booking.specialInstructions && (
					<div className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
						<span className="font-medium text-zinc-700 dark:text-zinc-300">Note:</span> {booking.specialInstructions}
					</div>
				)}
              </div>
            </article>
          )
        })}
      </div>
    )
}
