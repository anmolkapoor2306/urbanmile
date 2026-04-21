'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AdminPanel,
  AdminStatCard,
  AdminStatsGrid,
  adminInputClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/AdminLayout';
import type { SerializedBooking } from '@/lib/bookingRecord';
import type { SerializedDriver } from '@/lib/driverRecord';
import { getBookingStatusLabel, getDriverTypeLabel } from '@/lib/dispatch';
import { buildDispatchMetrics, getBookingDisplayAssignee } from '@/lib/opsDashboard';
import { cn, getCarTypeDisplay, getStatusColor } from '@/lib/utils';

type QueueFilter = 'READY' | 'ASSIGNED' | 'ACTIVE' | 'ALL';

export function DispatchBoard({
  drivers,
  bookings,
}: {
  drivers: SerializedDriver[];
  bookings: SerializedBooking[];
}) {
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('READY');
  const activeDrivers = drivers.filter((driver) => driver.isActive);
  const availableDrivers = activeDrivers.filter((driver) => driver.availabilityStatus === 'AVAILABLE');
  const metrics = buildDispatchMetrics(bookings, activeDrivers);

  const queueBookings = useMemo(() => {
    switch (queueFilter) {
      case 'READY':
        return bookings.filter((booking) => booking.status === 'CONFIRMED');
      case 'ASSIGNED':
        return bookings.filter((booking) => booking.status === 'ASSIGNED');
      case 'ACTIVE':
        return bookings.filter((booking) => booking.status === 'IN_PROGRESS');
      case 'ALL':
      default:
        return bookings;
    }
  }, [bookings, queueFilter]);

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-hidden">
      <AdminStatsGrid className="md:grid-cols-3 xl:grid-cols-6">
        {[
          ['Total Drivers', metrics.totalDrivers],
          ['Available Drivers', metrics.availableDrivers],
          ['Busy Drivers', metrics.busyDrivers],
          ['Waiting for Dispatch', metrics.confirmedWaitingForDispatch],
          ['Active Trips', metrics.activeTrips],
          ['Completed Today', metrics.completedToday],
        ].map(([label, value]) => (
          <AdminStatCard key={label} label={label} value={value} />
        ))}
      </AdminStatsGrid>

      <div className="flex flex-1 min-h-0 flex-col gap-6 xl:flex-row">
        <DispatchQueueColumn
          bookings={queueBookings}
          drivers={availableDrivers}
          filter={queueFilter}
          onFilterChange={setQueueFilter}
        />
        <AvailableDriversColumn drivers={availableDrivers} />
      </div>
    </div>
  );
}

function DispatchQueueColumn({
  bookings,
  drivers,
  filter,
  onFilterChange,
}: {
  bookings: SerializedBooking[];
  drivers: SerializedDriver[];
  filter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
}) {
  return (
    <AdminPanel className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
      <div className="shrink-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Dispatch Queue</h2>
            <p className="text-sm text-zinc-500">Confirmed rides on the left, available drivers on the right, with assignment done in one place.</p>
          </div>
          <span className="text-sm text-zinc-500">{bookings.length}</span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2">
          {[
            ['READY', 'Confirmed'],
            ['ASSIGNED', 'Assigned'],
            ['ACTIVE', 'Active'],
            ['ALL', 'All'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onFilterChange(key as QueueFilter)}
              className={cn(
                'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                filter === key
                  ? 'bg-amber-500 text-white'
                  : 'bg-zinc-950 text-zinc-300 hover:bg-zinc-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-scrollbar flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {bookings.length === 0 ? (
          <EmptyState message="No bookings in this queue." />
        ) : (
          bookings.map((booking) => <AssignableBookingCard key={booking.id} booking={booking} drivers={drivers} />)
        )}
      </div>
    </AdminPanel>
  );
}

function AvailableDriversColumn({ drivers }: { drivers: SerializedDriver[] }) {
  return (
    <AdminPanel id="drivers-section" className="flex min-h-0 flex-col overflow-hidden p-5 xl:w-[32%] xl:max-w-md xl:shrink-0">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Available Drivers</h2>
          <p className="text-sm text-zinc-500">Only drivers currently marked available are shown here.</p>
        </div>
        <span className="text-sm text-zinc-500">{drivers.length}</span>
      </div>

      <div className="dashboard-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {drivers.length === 0 ? (
          <EmptyState message="No available drivers right now." />
        ) : (
          drivers.map((driver) => (
            <div key={driver.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-100">{driver.name}</div>
                  <div className="mt-1 text-sm text-zinc-500">
                    {getCarTypeDisplay(driver.vehicleType)} · {driver.vehicleNumber}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {getDriverTypeLabel(driver.driverType as never)}

                  </div>
                </div>

                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  {driver.availabilityStatus || 'AVAILABLE'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </AdminPanel>
  );
}

function AssignableBookingCard({
  booking,
  drivers,
}: {
  booking: SerializedBooking;
  drivers: SerializedDriver[];
}) {
  const router = useRouter();
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [confirmedFare, setConfirmedFare] = useState(booking.fareAmount?.toString() ?? '');
  const [outsourcedOpen, setOutsourcedOpen] = useState(false);
  const [outsourceVendor, setOutsourceVendor] = useState(booking.manualVendorName ?? '');
  const [outsourceDriverName, setOutsourceDriverName] = useState(booking.manualDriverName ?? '');
  const [outsourcePhone, setOutsourcePhone] = useState(booking.manualDriverPhone ?? '');
  const [outsourceVehicle, setOutsourceVehicle] = useState(booking.manualVehicleDetails ?? '');
  const [outsourceCommission, setOutsourceCommission] = useState(booking.commissionAmount?.toString() ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function updateDispatch(payload: Record<string, unknown>) {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/bookings/${booking.id}/dispatch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update dispatch');
      }

      router.refresh();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  const parsedFare = confirmedFare.trim() === '' ? null : Number(confirmedFare);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="truncate text-sm font-semibold text-zinc-100">{booking.bookingReference}</div>
          <div className="truncate text-sm text-zinc-100">{booking.pickupLocation} → {booking.dropoffLocation}</div>
          <div className="text-sm text-zinc-300">{booking.fullName} · {booking.phone}</div>
          <div className="text-sm text-zinc-500">
            {formatDate(booking.pickupDateTime)} · {formatTime(booking.pickupDateTime)} · {getCarTypeDisplay(booking.carType)}
          </div>
          <div className="text-sm text-zinc-500">
            Fare {booking.fareAmount ? formatMoney(booking.fareAmount) : 'Pending'} · {getBookingDisplayAssignee(booking)}
          </div>
        </div>

        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', getStatusColor(booking.status))}>
          {getBookingStatusLabel(booking.status as never)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[180px_1fr]">
        <input
          type="number"
          min="0"
          step="0.01"
          value={confirmedFare}
          onChange={(event) => setConfirmedFare(event.target.value)}
          placeholder="Confirmed fare"
          className={inputClassName}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              if (parsedFare === null || Number.isNaN(parsedFare)) {
                alert('Enter the confirmed fare first.');
                return;
              }

              void updateDispatch({
                fareAmount: parsedFare,
                status: booking.status === 'NEW' ? 'CONFIRMED' : booking.status,
              });
            }}
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
          >
            {booking.status === 'NEW' ? 'Confirm Fare' : 'Save Fare'}
          </button>

          {booking.status === 'ASSIGNED' ? (
            <button
              type="button"
              disabled={isSaving}
            onClick={() => void updateDispatch({ status: 'IN_PROGRESS' })}
            className={adminSecondaryButtonClassName}
          >
            Start Trip
            </button>
          ) : null}

          {booking.status === 'IN_PROGRESS' ? (
            <button
              type="button"
              disabled={isSaving}
            onClick={() => void updateDispatch({ status: 'COMPLETED' })}
            className={adminSecondaryButtonClassName}
          >
            Complete Trip
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          value={selectedDriverId}
          onChange={(e) => setSelectedDriverId(e.target.value)}
          disabled={isSaving || drivers.length === 0}
          className={adminInputClassName}
        >
          <option value="">Choose available driver</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.name} · {driver.vehicleNumber}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            if (!selectedDriverId) return;
            void updateDispatch({
              driverId: selectedDriverId,
              fareAmount: parsedFare,
              status: 'ASSIGNED',
            });
          }}
          disabled={isSaving || !selectedDriverId}
          className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
        >
          {isSaving ? 'Assigning...' : 'Assign Driver'}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-zinc-100">Outsourced Driver</div>
            <div className="text-xs text-zinc-500">Use this only when the ride is given to an external driver or company.</div>
          </div>
          <button
            type="button"
            onClick={() => setOutsourcedOpen((open) => !open)}
            className="text-sm font-medium text-amber-500 transition-colors hover:text-amber-400"
          >
            {outsourcedOpen ? 'Hide' : 'Use Outsourced'}
          </button>
        </div>

        {outsourcedOpen ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input value={outsourceVendor} onChange={(e) => setOutsourceVendor(e.target.value)} placeholder="Vendor / company name" className={adminInputClassName} />
            <input value={outsourceDriverName} onChange={(e) => setOutsourceDriverName(e.target.value)} placeholder="Driver name" className={adminInputClassName} />
            <input value={outsourcePhone} onChange={(e) => setOutsourcePhone(e.target.value)} placeholder="Phone" className={adminInputClassName} />
            <input value={outsourceVehicle} onChange={(e) => setOutsourceVehicle(e.target.value)} placeholder="Vehicle details" className={adminInputClassName} />
            <input value={outsourceCommission} onChange={(e) => setOutsourceCommission(e.target.value)} placeholder="Commission" type="number" min="0" step="0.01" className={adminInputClassName} />

            <div className="md:col-span-2 flex justify-end">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  if (!outsourceVendor && !outsourceDriverName) {
                    alert('Enter vendor or driver details first.');
                    return;
                  }

                  void updateDispatch({
                    fareAmount: parsedFare,
                    status: 'ASSIGNED',
                    manualVendorName: outsourceVendor || null,
                    manualDriverName: outsourceDriverName || null,
                    manualDriverPhone: outsourcePhone || null,
                    manualVehicleDetails: outsourceVehicle || null,
                    commissionAmount: outsourceCommission ? Number(outsourceCommission) : null,
                  });
                }}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
              >
                Save Outsourced Assignment
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 px-4 py-6 text-sm text-zinc-500">
      {message}
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
