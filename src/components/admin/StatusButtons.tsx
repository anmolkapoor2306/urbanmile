'use client'

import { useState } from 'react'

export default function StatusButtons({ bookingId, currentStatus, onStatusChange }: { bookingId: string, currentStatus: string, onStatusChange?: (status: string) => void }) {
  const [selected, setSelected] = useState(currentStatus.toUpperCase())
  const [saving, setSaving] = useState(false)

  const STATUSES = ['NEW', 'CONFIRMED', 'ASSIGNED', 'ACTIVE', 'COMPLETE', 'CANCELLED']

  const STATUS_STYLES: Record<string, { active: string; inactive: string }> = {
    NEW: { active: 'bg-orange-500 text-white', inactive: 'border border-orange-500 text-orange-400' },
    CONFIRMED: { active: 'bg-blue-500 text-white', inactive: 'border border-blue-500 text-blue-400' },
    ACTIVE: { active: 'bg-cyan-600 text-white', inactive: 'border border-cyan-500 text-cyan-400' },
    ASSIGNED: { active: 'bg-violet-500 text-white', inactive: 'border border-violet-500 text-violet-400' },
    COMPLETE: { active: 'bg-green-500 text-white', inactive: 'border border-green-500 text-green-400' },
  }

  const handleClick = async (status: string) => {
    if (status === selected || saving) return
    setSaving(true)
    setSelected(status)
    
    try {
      const apiStatus = status === 'COMPLETE' ? 'COMPLETED' : status === 'ACTIVE' ? 'ACTIVE' : status
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: apiStatus }),
      })
      
      if (!response.ok) throw new Error('Failed to update status')
      
      onStatusChange?.(status)
    } catch (error) {
      console.error('Status update failed:', error)
      setSelected(currentStatus.toUpperCase())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-nowrap gap-1.5">
      {STATUSES.map((status) => {
        const styles = STATUS_STYLES[status]
        const isActive = selected === status
        return (
          <button
            key={status}
            onClick={() => handleClick(status)}
            disabled={saving}
            className={`px-2 py-0.5 text-xs font-medium rounded-full transition-colors transform transition-transform duration-150 hover:scale-110 cursor-pointer ${
              isActive ? styles.active + ' scale-105' : styles.inactive + ' bg-transparent'
            }`}
          >
            {status === 'NEW' ? 'New/Unassigned' : status === 'ACTIVE' ? 'Active' : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        )
      })}
    </div>
  )
}
