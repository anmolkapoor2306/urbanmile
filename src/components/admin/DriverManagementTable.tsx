'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SerializedDriver } from '@/lib/driverRecord';
import { getDriverTypeLabel } from '@/lib/dispatch';
import { getCarTypeDisplay } from '@/lib/utils';

type DriverFormState = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  driverType: 'OWN' | 'THIRD_PARTY' | 'VENDOR';
  companyName: string;
  vehicleNumber: string;
  vehicleType: 'SEDAN' | 'SUV' | 'VAN' | 'LUXURY';
  licenseInfo: string;
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  isActive: boolean;
  notes: string;
};

const emptyForm: DriverFormState = {
  name: '',
  phone: '',
  email: '',
  driverType: 'OWN',
  companyName: '',
  vehicleNumber: '',
  vehicleType: 'SEDAN',
  licenseInfo: '',
  availabilityStatus: 'AVAILABLE',
  isActive: true,
  notes: '',
};

export function DriverManagementTable({ drivers }: { drivers: SerializedDriver[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'OWN' | 'THIRD_PARTY' | 'VENDOR'>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<SerializedDriver | null>(null);
  const [editingDriver, setEditingDriver] = useState<DriverFormState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDrivers = useMemo(() => {
    const query = search.toLowerCase();
    return drivers.filter((driver) => {
      const matchesType = typeFilter === 'ALL' || driver.driverType === typeFilter;
      const matchesSearch =
        driver.name.toLowerCase().includes(query) ||
        driver.phone.includes(search) ||
        driver.vehicleNumber.toLowerCase().includes(query) ||
        (driver.companyName || '').toLowerCase().includes(query);

      return matchesType && matchesSearch;
    });
  }, [drivers, search, typeFilter]);

  async function saveDriver() {
    if (!editingDriver) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/drivers', {
        method: editingDriver.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDriver),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save driver');
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
  }

  async function removeDriver(id: string) {
    if (!confirm('Remove this driver?')) return;

    const response = await fetch(`/api/drivers?id=${id}`, { method: 'DELETE' });
    const payload = await response.json();
    if (!response.ok) {
      alert(payload.error || 'Failed to remove driver');
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Driver Management</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Manage own drivers, third-party drivers, and vendor/company operators.</p>
          </div>
          <button
            type="button"
            onClick={() => setEditingDriver(emptyForm)}
            className="inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
          >
            Add Driver
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by driver, phone, company, or vehicle"
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as 'ALL' | 'OWN' | 'THIRD_PARTY' | 'VENDOR')}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 md:w-56"
          >
            <option value="ALL">All Driver Types</option>
            <option value="OWN">Own Driver</option>
            <option value="THIRD_PARTY">Third Party Driver</option>
            <option value="VENDOR">Vendor / Company</option>
          </select>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="space-y-3">
            {filteredDrivers.map((driver) => (
              <div key={driver.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1.5">
                    <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{driver.name}</div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {driver.phone} · {driver.email || 'No email'} · {getDriverTypeLabel(driver.driverType as never)}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {getCarTypeDisplay(driver.vehicleType)} · {driver.vehicleNumber}
                      {driver.companyName ? ` · ${driver.companyName}` : ''}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDriver(driver)}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingDriver({
                          id: driver.id,
                          name: driver.name,
                          phone: driver.phone,
                          email: driver.email || '',
                          driverType: driver.driverType as DriverFormState['driverType'],
                          companyName: driver.companyName || '',
                          vehicleNumber: driver.vehicleNumber,
                          vehicleType: driver.vehicleType as DriverFormState['vehicleType'],
                          licenseInfo: driver.licenseInfo || '',
                          availabilityStatus: (driver.availabilityStatus || 'AVAILABLE') as DriverFormState['availabilityStatus'],
                          isActive: driver.isActive,
                          notes: driver.notes || '',
                        })
                      }
                      className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDriver(driver.id, { isActive: !driver.isActive })}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      {driver.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateDriver(driver.id, {
                          availabilityStatus: driver.availabilityStatus === 'AVAILABLE' ? 'BUSY' : 'AVAILABLE',
                        })
                      }
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      Mark {driver.availabilityStatus === 'AVAILABLE' ? 'Busy' : 'Available'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDriver(driver.id)}
                      className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Driver Detail</h3>
          {selectedDriver ? (
            <div className="mt-4 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <DetailRow label="Driver Code" value={selectedDriver.driverCode || 'Pending'} />
              <DetailRow label="Phone" value={selectedDriver.phone} />
              <DetailRow label="Email" value={selectedDriver.email || 'Not provided'} />
              <DetailRow label="Type" value={getDriverTypeLabel(selectedDriver.driverType as never)} />
              <DetailRow label="Availability" value={selectedDriver.availabilityStatus || 'AVAILABLE'} />
              <DetailRow label="Vehicle" value={`${getCarTypeDisplay(selectedDriver.vehicleType)} · ${selectedDriver.vehicleNumber}`} />
              <DetailRow label="Company" value={selectedDriver.companyName || 'N/A'} />
              <DetailRow label="License" value={selectedDriver.licenseInfo || 'N/A'} />
              <DetailRow label="Notes" value={selectedDriver.notes || 'No notes'} />
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Select a driver to view details.
            </div>
          )}
        </section>
      </div>

      {editingDriver ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-950/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {editingDriver.id ? 'Edit Driver' : 'Add Driver'}
                </h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Update driver profile, availability, and outsourced company details.</p>
              </div>
              <button type="button" onClick={() => setEditingDriver(null)} className="text-zinc-500 hover:text-zinc-300">
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Input label="Full Name" value={editingDriver.name} onChange={(value) => setEditingDriver({ ...editingDriver, name: value })} />
              <Input label="Phone" value={editingDriver.phone} onChange={(value) => setEditingDriver({ ...editingDriver, phone: value })} />
              <Input label="Email" value={editingDriver.email} onChange={(value) => setEditingDriver({ ...editingDriver, email: value })} />
              <Select
                label="Driver Type"
                value={editingDriver.driverType}
                onChange={(value) => setEditingDriver({ ...editingDriver, driverType: value as DriverFormState['driverType'] })}
                options={[
                  ['OWN', 'Own Driver'],
                  ['THIRD_PARTY', 'Third Party Driver'],
                  ['VENDOR', 'Vendor / Company'],
                ]}
              />
              <Input label="Company Name" value={editingDriver.companyName} onChange={(value) => setEditingDriver({ ...editingDriver, companyName: value })} />
              <Input label="Vehicle Number" value={editingDriver.vehicleNumber} onChange={(value) => setEditingDriver({ ...editingDriver, vehicleNumber: value })} />
              <Select
                label="Vehicle Type"
                value={editingDriver.vehicleType}
                onChange={(value) => setEditingDriver({ ...editingDriver, vehicleType: value as DriverFormState['vehicleType'] })}
                options={[
                  ['SEDAN', 'Sedan'],
                  ['SUV', 'SUV'],
                  ['VAN', 'Van'],
                  ['LUXURY', 'Luxury'],
                ]}
              />
              <Select
                label="Availability"
                value={editingDriver.availabilityStatus}
                onChange={(value) => setEditingDriver({ ...editingDriver, availabilityStatus: value as DriverFormState['availabilityStatus'] })}
                options={[
                  ['AVAILABLE', 'Available'],
                  ['BUSY', 'Busy'],
                  ['OFFLINE', 'Offline'],
                ]}
              />
              <Input label="License Info" value={editingDriver.licenseInfo} onChange={(value) => setEditingDriver({ ...editingDriver, licenseInfo: value })} />
              <label className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={editingDriver.isActive}
                  onChange={(event) => setEditingDriver({ ...editingDriver, isActive: event.target.checked })}
                />
                Active driver
              </label>
              <label className="md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">Notes</span>
                <textarea
                  rows={4}
                  value={editingDriver.notes}
                  onChange={(event) => setEditingDriver({ ...editingDriver, notes: event.target.value })}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingDriver(null)} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200">
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={saveDriver}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
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
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{value}</div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
      <span className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
