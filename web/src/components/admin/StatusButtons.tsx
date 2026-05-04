'use client'

import { useState } from 'react'
import type { BookingStatusValue } from '@/lib/dispatch'
import { BOOKING_STATUSES } from '@/lib/dispatch'

export default function StatusButtons({ bookingId, currentStatus, onStatusChange }: { bookingId: string, currentStatus: BookingStatusValue, onStatusChange?: (status: BookingStatusValue) => void }) {
  const [selected, setSelected] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  void bookingId

  const STATUSES = BOOKING_STATUSES

  function updateStatus(newStatus: BookingStatusValue) {
    setSelected(newStatus)
    setSaving(true)

    onStatusChange?.(newStatus)

    // In a real app, this would be a fetch to the API
    setTimeout(() => {
      setSaving(false)
    }, 300)
  }

  return (
    <div className="flex items-center gap-2">
      {STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => updateStatus(status)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors border shadow-sm $
            ${status === selected ? 'bg-zinc-900 text-white dark:bg-zinc-700' : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'}
            ${saving && status === selected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${status === selected ? 'cursor-default' : ''}`}>
            {status.toLowerCase()}
          </button>
      ))}
    </div>
  )
}
