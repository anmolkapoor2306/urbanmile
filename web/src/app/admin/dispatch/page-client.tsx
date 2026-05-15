'use client';

import { AdminPageFrame, AdminPanel } from '@/components/admin/AdminLayout';
import { DispatchBoard } from '@/components/admin/DispatchBoard';
import type { SerializedBooking } from '@/lib/bookingRecord';
import type { SerializedDriver } from '@/lib/driverRecord';
import type { SerializedOperationalZone, SerializedServiceControlConfig } from '@/lib/operationalZoneRules';

export function DispatchPageWrapper({
  drivers,
  bookings,
  operationalZones,
  serviceConfig,
  loadError,
  adminRole,
}: {
  drivers: SerializedDriver[];
  bookings: SerializedBooking[];
  operationalZones: SerializedOperationalZone[];
  serviceConfig: SerializedServiceControlConfig;
  loadError: string | null;
  adminRole?: string;
}) {
  return (
    <AdminPageFrame currentPage="dispatch" adminRole={adminRole}>
        <div className="flex w-full min-w-0 flex-1 min-h-0 flex-col overflow-hidden">
          {loadError ? (
            <AdminPanel className="mb-6 shrink-0 border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 shadow-none">
              {loadError}
            </AdminPanel>
          ) : null}

          <DispatchBoard drivers={drivers} bookings={bookings} operationalZones={operationalZones} serviceConfig={serviceConfig} />
        </div>
    </AdminPageFrame>
  );
}
