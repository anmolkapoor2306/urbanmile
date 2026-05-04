'use client';

import { useState } from 'react';

interface FareToggleProps {
  fareAmount: number | null;
  fareValue: string;
  onFareValueChange: (value: string) => void;
  onFareConfirmed: () => void;
  isSaving: boolean;
  isNew: boolean;
  commissionRate?: number;
}

export default function FareToggle({
  fareAmount,
  fareValue,
  onFareValueChange,
  onFareConfirmed,
  isSaving,
  isNew,
  commissionRate = 0.1,
}: FareToggleProps) {
  const [isCommission, setIsCommission] = useState(false);
  void isNew;

  const displayValue = fareAmount
    ? isCommission
      ? `₹${Math.round(fareAmount * commissionRate).toLocaleString('en-IN')}`
      : `₹${fareAmount.toLocaleString('en-IN')}`
    : 'Pending';

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs ${!isCommission ? 'text-white' : 'text-zinc-400'}`}>Fare</span>
        <button
          onClick={() => setIsCommission(!isCommission)}
          className={`relative w-10 h-5 rounded-full transition-colors bg-orange-500`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              isCommission ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className={`text-xs ${isCommission ? 'text-white' : 'text-zinc-400'}`}>Commission</span>
      </div>

      <input
        type="number"
        min="0"
        step="0.01"
        value={fareValue}
        onChange={(event) => onFareValueChange(event.target.value)}
        className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
      />

      <button
        type="button"
        disabled={isSaving}
        onClick={onFareConfirmed}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
      >
        Save Fare
      </button>
      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{displayValue}</span>
    </div>
  );
}
