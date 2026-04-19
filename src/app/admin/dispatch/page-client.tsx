'use client';

import { DispatchBoard } from '@/components/admin/DispatchBoard';
import type { SerializedBooking } from '@/lib/bookingRecord';
import type { SerializedDriver } from '@/lib/driverRecord';
import { DashboardHeader } from '@/components/admin/DashboardHeader';

export function DispatchPageWrapper({
  drivers,
  bookings,
  loadError,
}: {
  drivers: SerializedDriver[];
  bookings: SerializedBooking[];
  loadError: string | null;
}) {
  return (
    <div className="min-h-screen h-screen flex flex-col overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <DashboardHeader title="Dispatch Dashboard" currentPage="dispatch" />

      <main className="flex-1 min-h-0 flex overflow-hidden">
        <div className="mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 flex flex-col flex-1 min-h-0">
          {loadError ? (
            <div className="mb-6 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
              {loadError}
            </div>
          ) : null}

          <DispatchBoard drivers={drivers} bookings={bookings} />
        </div>
      </main>
    </div>
  );
}
