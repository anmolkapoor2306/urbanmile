'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCarTypeDisplay } from '@/lib/utils';

export function EditableVehiculeTypeSelect({ carType, bookingId }: { carType: string; bookingId: string }) {
  const [selectedType, setSelectedType] = useState(carType);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const CARS = ['Sedan', 'MUV / SUV', 'Large Vehicle'] as const;

  async function updateCarType(carType: string) {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carType }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update car type');
      }

      setSelectedType(carType);
      router.refresh();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <select
      value={selectedType}
      onChange={(e) => void updateCarType(e.target.value)}
      disabled={isSaving}
      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
    >
      {CARS.map((type) => (
        <option key={type} value={type}>{type}</option>
      ))}
    </select>
  );
}
