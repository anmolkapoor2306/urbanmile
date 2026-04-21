'use client'

import { useState } from 'react'

export default function ArchiveToggle({ onToggle }: { onToggle: (showArchived: boolean) => void }) {
  const [isOn, setIsOn] = useState(false)

  return (
    <button
      onClick={() => { const next = !isOn; setIsOn(next); onToggle(next) }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
        isOn ? 'border border-amber-500 text-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.25)]' : 'border border-zinc-600 text-zinc-400 bg-zinc-800'
      }`}
    >
      <span className="text-xs whitespace-nowrap">Show Archived</span>
      <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${
        isOn ? 'bg-amber-500' : 'bg-zinc-600'
      }`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
          isOn ? 'translate-x-4' : 'translate-x-0.5'
        }`} />
      </div>
    </button>
  )
}
