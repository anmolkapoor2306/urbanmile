'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SerializedBooking } from '@/lib/bookingRecord';
import type { SerializedDriver } from '@/lib/driverRecord';
import { getDriverTypeLabel } from '@/lib/dispatch';
import { cn, toTitleCase } from '@/lib/utils';

type DriverFormState = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  licenseInfo: string;
  availabilityStatus?: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  notes: string;
};

const emptyForm: DriverFormState = {
  name: '',
  phone: '',
  email: '',
  licenseInfo: '',
  notes: '',
};

export function DriverManagementTable({ drivers, bookings = [] }: { drivers: SerializedDriver[]; bookings?: SerializedBooking[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'OWN' | 'THIRD_PARTY' | 'VENDOR'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'ASSIGNED' | 'ON_TRIP' | 'OFF_DUTY'>('ALL');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [editingDriver, setEditingDriver] = useState<DriverFormState | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDrivers = useMemo(() => {
    const query = search.toLowerCase();
    return drivers.filter((driver) => {
      const matchesType = typeFilter === 'ALL' || driver.driverType === typeFilter;
      const visualStatus = getDriverVisualStatus(driver, bookings);
      const matchesStatus = statusFilter === 'ALL' || visualStatus === statusFilter;
      const matchesSearch =
        driver.name.toLowerCase().includes(query) ||
        driver.phone.includes(search) ||
        (driver.email || '').toLowerCase().includes(query) ||
        (driver.driverCode || '').toLowerCase().includes(query);

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [bookings, drivers, search, statusFilter, typeFilter]);

  const selectedDriver = useMemo(
    () => (selectedDriverId ? drivers.find((driver) => driver.id === selectedDriverId) ?? null : null),
    [drivers, selectedDriverId]
  );

  useEffect(() => {
    if (!openMenuId) return;

    function handleWindowClick() {
      setOpenMenuId(null);
    }

    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [openMenuId]);

  async function saveDriver() {
    if (!editingDriver) return;
    setIsSubmitting(true);

    const payload = editingDriver.id
      ? {
          id: editingDriver.id,
          name: editingDriver.name,
          phone: editingDriver.phone,
          email: editingDriver.email,
          availabilityStatus: editingDriver.availabilityStatus,
          licenseInfo: editingDriver.licenseInfo,
          notes: editingDriver.notes,
        }
      : {
          name: editingDriver.name,
          phone: editingDriver.phone,
          email: editingDriver.email,
          licenseInfo: editingDriver.licenseInfo,
          notes: editingDriver.notes,
        };

    try {
      const response = await fetch('/api/drivers', {
        method: editingDriver.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json();
      if (!response.ok) {
        throw new Error(responsePayload.error || 'Failed to save driver');
      }

      setEditingDriver(null);
      router.refresh();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function updateDriver(id: string, patch: Record<string, unknown>) {
    try {
      const response = await fetch('/api/drivers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update driver');
      }

      router.refresh();
    } catch (error) {
      alert((error as Error).message);
    }
  }

  async function removeDriver(id: string) {
    if (!confirm('Remove this driver?')) return;

    const response = await fetch(`/api/drivers?id=${id}`, { method: 'DELETE' });
    const payload = await response.json();
    if (!response.ok) {
      alert(payload.error || 'Failed to remove driver');
      return;
    }

    if (selectedDriverId === id) {
      setSelectedDriverId(null);
    }

    router.refresh();
  }

  function startEditingDriver(driver: SerializedDriver) {
    setEditingDriver({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      email: driver.email || '',
      licenseInfo: driver.licenseInfo || '',
      availabilityStatus: (driver.availabilityStatus || 'OFFLINE') as DriverFormState['availabilityStatus'],
      notes: driver.notes || '',
    });
  }

  function viewDriver(driverId: string) {
    setSelectedDriverId(driverId);
    setOpenMenuId(null);
  }

  async function runDriverAction(action: 'edit' | 'remove' | 'toggle-active' | 'toggle-availability' | 'off-duty', driver: SerializedDriver) {
    setOpenMenuId(null);

    if (action === 'edit') {
      startEditingDriver(driver);
      return;
    }

    if (action === 'remove') {
      await removeDriver(driver.id);
      return;
    }

    if (action === 'toggle-active') {
      await updateDriver(driver.id, { isActive: !driver.isActive });
      return;
    }

    if (action === 'toggle-availability') {
      await updateDriver(driver.id, {
        availabilityStatus: getDriverVisualStatus(driver, bookings) === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE',
      });
      return;
    }

    await updateDriver(driver.id, { availabilityStatus: 'OFFLINE' });
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col gap-5 overflow-hidden">
      <section className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by driver, phone, email, or code"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 md:min-w-[24rem]"
            />
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'ALL' | 'OWN' | 'THIRD_PARTY' | 'VENDOR')}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 md:w-56"
            >
              <option value="ALL">All Driver Types</option>
              <option value="OWN">Own Driver</option>
              <option value="THIRD_PARTY">Third Party Driver</option>
              <option value="VENDOR">Vendor / Company</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-950 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 md:w-48"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="OFF_DUTY">Off Duty</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setEditingDriver(emptyForm)}
            className="inline-flex items-center rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
          >
            Add Driver
          </button>
        </div>
      </section>

      <div className="grid w-full flex-1 min-h-0 min-w-0 grid-cols-1 gap-6 lg:grid-cols-[2fr_1.2fr]">
        <section className="min-h-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex h-full min-h-0 flex-col p-5">
            <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Driver List</h3>
                <p className="mt-1 text-sm text-zinc-500">Compact roster with quick actions and live status indicators.</p>
              </div>
              <span className="text-sm text-zinc-500">
                {filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="dashboard-scrollbar flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver) => {
                  const isSelected = selectedDriverId === driver.id;
                  const visualStatus = getDriverVisualStatus(driver, bookings);
                  const nextBooking = getNextDriverBooking(bookings, driver.id);

                  return (
                    <div
                      key={driver.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => viewDriver(driver.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          viewDriver(driver.id);
                        }
                      }}
                      className={cn(
                        'group rounded-2xl border bg-zinc-950/80 p-4 shadow-[0_12px_35px_rgba(0,0,0,0.22)] transition-all hover:border-amber-400/35 hover:shadow-[0_16px_42px_rgba(245,158,11,0.08)]',
                        isSelected ? 'border-amber-400/60 ring-1 ring-amber-400/20' : 'border-zinc-800'
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <DriverAvatar driver={driver} />

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="truncate text-sm font-semibold text-zinc-100">{toTitleCase(driver.name)}</div>
                          <div className="truncate text-sm text-zinc-400">{driver.phone} • {driver.email || 'No email'}</div>
                          <div className="truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            {getDriverTypeLabel(driver.driverType as never)} • {getDriverCodeValue(driver)}
                          </div>
                          <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            Next: {nextBooking ? formatDateTime(nextBooking.pickupDateTime) : 'No upcoming booking'}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              viewDriver(driver.id);
                            }}
                            className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
                          >
                            View
                          </button>

                          <div className="relative">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenMenuId((current) => (current === driver.id ? null : driver.id));
                              }}
                              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-lg leading-none text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
                              aria-label={`More actions for ${toTitleCase(driver.name)}`}
                            >
                              ⋮
                            </button>

                            {openMenuId === driver.id ? (
                              <div
                                className="absolute right-0 top-12 z-20 w-48 rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-[0_18px_45px_rgba(0,0,0,0.45)]"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <ActionMenuItem label="Edit" onClick={() => void runDriverAction('edit', driver)} />
                                <ActionMenuItem
                                  label={driver.isActive ? 'Deactivate' : 'Activate'}
                                  onClick={() => void runDriverAction('toggle-active', driver)}
                                />
                                <ActionMenuItem
                                  label={visualStatus === 'AVAILABLE' ? 'Mark Busy' : 'Mark Available'}
                                  onClick={() => void runDriverAction('toggle-availability', driver)}
                                />
                                <ActionMenuItem label="Remove" tone="danger" onClick={() => void runDriverAction('remove', driver)} />
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 px-4 py-6 text-sm text-zinc-500">
                  No drivers match the current search and filter.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="min-h-0 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex h-full min-h-0 flex-col p-5">
            <div className="mb-4 shrink-0">
              <h3 className="text-base font-semibold text-zinc-100">Driver Details</h3>
            </div>

            <div className="dashboard-scrollbar flex-1 min-h-0 overflow-y-auto pr-1">
              {selectedDriver ? (
                <div className="space-y-4 text-sm text-zinc-300">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                    <div className="flex items-start gap-4">
                      <DriverAvatar driver={selectedDriver} size="lg" />
                      <div className="min-w-0 flex-1">
                         <div className="truncate text-xl font-semibold text-zinc-100">{toTitleCase(selectedDriver.name)}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <DetailChip>{getDriverTypeLabel(selectedDriver.driverType as never)}</DetailChip>
                          <DetailChip tone="muted">{getDriverCodeValue(selectedDriver)}</DetailChip>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:grid-cols-2">
                    <DetailRow label="Phone" value={selectedDriver.phone} />
                    <DetailRow label="Email" value={selectedDriver.email || 'Not provided'} />
                    <DetailRow label="License" value={selectedDriver.licenseInfo || 'N/A'} />
                    <DetailRow label="Notes" value={selectedDriver.notes || 'No notes'} />
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Quick Actions</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <QuickActionButton onClick={() => startEditingDriver(selectedDriver)}>Edit Driver</QuickActionButton>
                      <QuickActionButton onClick={() => void runDriverAction('toggle-active', selectedDriver)}>
                        {selectedDriver.isActive ? 'Deactivate Driver' : 'Activate Driver'}
                      </QuickActionButton>
                      <QuickActionButton onClick={() => void updateDriver(selectedDriver.id, { availabilityStatus: 'AVAILABLE' })}>
                        Mark Available
                      </QuickActionButton>
                      <QuickActionButton onClick={() => void updateDriver(selectedDriver.id, { availabilityStatus: 'BUSY' })}>
                        Mark Busy
                      </QuickActionButton>
                      <QuickActionButton onClick={() => void runDriverAction('off-duty', selectedDriver)}>Mark Off Duty</QuickActionButton>
                      <QuickActionButton tone="danger" onClick={() => void runDriverAction('remove', selectedDriver)}>
                        Remove Driver
                      </QuickActionButton>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/70 px-4 py-6 text-sm text-zinc-500">
                  Select a driver to view details.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {editingDriver ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  {editingDriver.id ? 'Edit Driver' : 'Add Driver'}
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {editingDriver.id ? 'Update driver profile and availability details.' : 'Add a new internal driver to the fleet.'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Input label="Full Name" value={editingDriver.name} onChange={(value) => setEditingDriver({ ...editingDriver, name: value })} />
              <Input label="Phone" value={editingDriver.phone} onChange={(value) => setEditingDriver({ ...editingDriver, phone: value })} />
              <Input label="Email" value={editingDriver.email} onChange={(value) => setEditingDriver({ ...editingDriver, email: value })} />
              {editingDriver.id ? (
                <Select
                  label="Availability"
                  value={editingDriver.availabilityStatus || 'OFFLINE'}
                  onChange={(value) => setEditingDriver({ ...editingDriver, availabilityStatus: value as DriverFormState['availabilityStatus'] })}
                  options={[
                    ['AVAILABLE', 'Available'],
                    ['BUSY', 'Busy'],
                    ['OFFLINE', 'Offline'],
                  ]}
                />
              ) : null}
              <Input label="License Info" value={editingDriver.licenseInfo} onChange={(value) => setEditingDriver({ ...editingDriver, licenseInfo: value })} />
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-zinc-200">Notes</span>
                <textarea
                  rows={4}
                  value={editingDriver.notes}
                  onChange={(event) => setEditingDriver({ ...editingDriver, notes: event.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingDriver(null)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={saveDriver}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
              >
                {isSubmitting ? 'Saving...' : editingDriver.id ? 'Save Changes' : 'Create Driver'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{value}</div>
    </div>
  );
}

function DriverAvatar({ driver, size = 'md' }: { driver: SerializedDriver; size?: 'md' | 'lg' }) {
  const visualStatus = getDriverVisualStatus(driver);

  return (
    <div className={cn('relative shrink-0', size === 'lg' ? 'h-16 w-16' : 'h-12 w-12')}>
      <div
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full bg-zinc-800 font-semibold text-zinc-100 ring-1 ring-white/10',
          size === 'lg' ? 'text-lg' : 'text-sm'
        )}
      >
        {getDriverInitials(driver.name)}
      </div>
      <span
        className={cn(
          'absolute bottom-0 right-0 rounded-full border-2 border-zinc-950',
          size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5',
          visualStatus === 'AVAILABLE'
            ? 'bg-emerald-500'
            : visualStatus === 'ASSIGNED' || visualStatus === 'ON_TRIP'
              ? 'bg-amber-500'
              : 'bg-zinc-500'
        )}
      />
    </div>
  );
}

function DetailChip({ children, tone = 'brand' }: { children: string; tone?: 'brand' | 'muted' }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-3 py-1 text-xs font-medium',
        tone === 'brand'
          ? 'border-amber-400/20 bg-amber-500/10 text-amber-200'
          : 'border-zinc-700 bg-zinc-950 text-zinc-300'
      )}
    >
      {children}
    </span>
  );
}

function ActionMenuItem({
  label,
  onClick,
  tone = 'default',
}: {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full rounded-xl px-3 py-2 text-left text-sm transition-colors',
        tone === 'danger' ? 'text-red-300 hover:bg-red-500/10' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
      )}
    >
      {label}
    </button>
  );
}

function QuickActionButton({
  children,
  onClick,
  tone = 'default',
}: {
  children: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
        tone === 'danger'
          ? 'border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/15'
          : 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900'
      )}
    >
      {children}
    </button>
  );
}

function getDriverInitials(name: string) {
  const normalizedName = toTitleCase(name);
  return normalizedName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}


function getDriverVisualStatus(driver: SerializedDriver, bookings: SerializedBooking[] = []) {
  if (!driver.isActive) {
    return 'OFF_DUTY';
  }

  if (bookings.some((booking) => booking.driverId === driver.id && booking.status === 'ACTIVE')) {
    return 'ON_TRIP';
  }

  if (bookings.some((booking) => booking.driverId === driver.id && booking.status === 'ASSIGNED')) {
    return 'ASSIGNED';
  }

  if (driver.availabilityStatus === 'AVAILABLE') {
    return 'AVAILABLE';
  }

  return 'OFF_DUTY';
}

function getDriverCodeValue(driver: SerializedDriver) {
  return driver.driverCode || 'DRV-0000';
}

function getNextDriverBooking(bookings: SerializedBooking[], driverId: string) {
  const now = Date.now();
  return [...bookings]
    .filter((booking) => booking.driverId === driverId && ['ASSIGNED', 'ACTIVE'].includes(booking.status) && new Date(booking.pickupDateTime).getTime() >= now)
    .sort((a, b) => +new Date(a.pickupDateTime) - +new Date(b.pickupDateTime))[0] ?? null;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-zinc-200">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-zinc-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
