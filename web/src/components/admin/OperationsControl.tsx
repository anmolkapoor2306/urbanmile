'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Car,
  MapPin,
  Plane,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  AdminPanel,
  adminInputClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/AdminLayout';
import {
  OPERATIONAL_VEHICLE_TYPES,
  type OperationalVehicleType,
  type SerializedOperationalZone,
} from '@/lib/operationalZoneRules';
import { cn } from '@/lib/utils';

type ZoneDraft = Omit<SerializedOperationalZone, 'createdAt' | 'updatedAt'>;

const emptyZoneDraft: ZoneDraft = {
  id: '',
  city: '',
  status: 'ENABLED',
  serviceRadiusKm: 25,
  airportEnabled: true,
  outstationEnabled: true,
  autoDispatchEnabled: true,
  enabledVehicleTypes: ['SEDAN'],
};

export function OperationsControl({ initialZones }: { initialZones: SerializedOperationalZone[] }) {
  const router = useRouter();
  const [zones, setZones] = useState(initialZones);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(initialZones[0]?.id ?? 'new');
  const [draft, setDraft] = useState<ZoneDraft>(initialZones[0] ? toDraft(initialZones[0]) : emptyZoneDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SerializedOperationalZone | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const isNewZone = selectedId === 'new';
  const selectedZone = zones.find((zone) => zone.id === selectedId) ?? null;
  const filteredZones = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return zones;
    return zones.filter((zone) => zone.city.toLowerCase().includes(needle));
  }, [query, zones]);

  function selectZone(zone: SerializedOperationalZone) {
    setSelectedId(zone.id);
    setDraft(toDraft(zone));
    setToast(null);
  }

  function startNewZone() {
    setSelectedId('new');
    setDraft(emptyZoneDraft);
    setDeleteTarget(null);
    setToast(null);
  }

  async function saveDraft() {
    setIsSaving(true);
    setToast(null);

    try {
      const response = await fetch('/api/admin/operational-zones', {
        method: isNewZone ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Could not save operational zone.');
      }

      const saved = payload.data as SerializedOperationalZone;
      setZones((current) => {
        if (isNewZone) return [saved, ...current].sort(sortZones);
        return current.map((zone) => (zone.id === saved.id ? saved : zone)).sort(sortZones);
      });
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      setToast(payload.message || 'Operational zone saved.');
      router.refresh();
    } catch (error) {
      setToast((error as Error).message || 'Could not save operational zone.');
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatusInstant(zone: SerializedOperationalZone, status: ZoneDraft['status']) {
    setIsSaving(true);
    setToast(null);

    try {
      const response = await fetch('/api/admin/operational-zones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: zone.id, status }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Could not update zone status.');
      }

      const saved = payload.data as SerializedOperationalZone;
      setZones((current) => current.map((item) => (item.id === saved.id ? saved : item)).sort(sortZones));
      if (selectedId === saved.id) setDraft(toDraft(saved));
      setToast(status === 'DISABLED' ? 'Zone disabled.' : 'Zone enabled.');
      router.refresh();
    } catch (error) {
      setToast((error as Error).message || 'Could not update zone status.');
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteZone() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setToast(null);

    try {
      const response = await fetch('/api/admin/operational-zones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Could not delete operational zone.');
      }

      const remainingZones = zones.filter((zone) => zone.id !== deleteTarget.id).sort(sortZones);
      setZones(remainingZones);

      const nextZone = remainingZones[0];
      if (nextZone) {
        setSelectedId(nextZone.id);
        setDraft(toDraft(nextZone));
      } else {
        setSelectedId('new');
        setDraft(emptyZoneDraft);
      }

      setDeleteTarget(null);
      setToast(payload.message || 'Operational zone deleted.');
      router.refresh();
    } catch (error) {
      setToast((error as Error).message || 'Could not delete operational zone.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500 dark:text-amber-300">Dispatch Module</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Operations Control</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Control serviceable pickup zones, ride categories, vehicle availability, and auto-dispatch behavior.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewZone}
            disabled={isSaving || isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create new zone
          </button>
        </div>
      </div>

      {toast ? (
        <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          {toast}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.4fr)]">
        <AdminPanel className="flex min-h-[260px] flex-col overflow-hidden p-4">
          <div className="mb-4 flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 dark:border-zinc-800 dark:bg-zinc-900">
            <Search className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-500 dark:text-zinc-100"
              placeholder="Search city"
            />
          </div>

          <div className="dashboard-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredZones.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                {zones.length === 0 ? (
                  <div className="space-y-3">
                    <p>No operational zones yet.</p>
                    <button
                      type="button"
                      onClick={startNewZone}
                      className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                    >
                      Create new zone
                    </button>
                  </div>
                ) : (
                  'No operational zones match this search.'
                )}
              </div>
            ) : (
              filteredZones.map((zone) => (
                <ZoneListButton
                  key={zone.id}
                  zone={zone}
                  selected={selectedId === zone.id}
                  disabled={isSaving || isDeleting}
                  onSelect={() => selectZone(zone)}
                  onToggleStatus={() => void updateStatusInstant(zone, zone.status === 'DISABLED' ? 'ENABLED' : 'DISABLED')}
                />
              ))
            )}
          </div>
        </AdminPanel>

        <AdminPanel className="flex min-h-0 flex-col overflow-hidden p-4">
          <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-black text-zinc-950 dark:text-white">{isNewZone ? 'Create zone' : draft.city}</h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Changes affect fare checks, booking creation, and dispatch availability.
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              {!isNewZone && selectedZone ? (
                <button
                  type="button"
                  disabled={isSaving || isDeleting}
                  onClick={() => setDeleteTarget(selectedZone)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition-colors hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200 dark:hover:border-red-800 dark:hover:bg-red-950/50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete zone
                </button>
              ) : null}
              <button type="button" disabled={isSaving || isDeleting} onClick={startNewZone} className={adminSecondaryButtonClassName}>
                <RotateCcw className="mr-2 inline h-4 w-4" aria-hidden="true" />
                Reset
              </button>
              <button
                type="button"
                disabled={isSaving || isDeleting}
                onClick={() => void saveDraft()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>

          <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto pt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="City name">
                <input
                  value={draft.city}
                  onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))}
                  className={adminInputClassName}
                  placeholder="Jalandhar"
                />
              </Field>
              <Field label="Operational status">
                <select
                  value={draft.status}
                  onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ZoneDraft['status'] }))}
                  className={adminInputClassName}
                >
                  <option value="ENABLED">Enabled</option>
                  <option value="LIMITED">Limited</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </Field>
              <Field label="Service Radius (KM)">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={draft.serviceRadiusKm}
                  onChange={(event) => setDraft((current) => ({ ...current, serviceRadiusKm: Number(event.target.value) }))}
                  className={adminInputClassName}
                />
              </Field>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <ToggleCard
                icon={Plane}
                label="Airport rides"
                checked={draft.airportEnabled}
                onChange={(checked) => setDraft((current) => ({ ...current, airportEnabled: checked }))}
              />
              <ToggleCard
                icon={MapPin}
                label="Outstation rides"
                checked={draft.outstationEnabled}
                onChange={(checked) => setDraft((current) => ({ ...current, outstationEnabled: checked }))}
              />
              <ToggleCard
                icon={Zap}
                label="Auto dispatch"
                checked={draft.autoDispatchEnabled}
                onChange={(checked) => setDraft((current) => ({ ...current, autoDispatchEnabled: checked }))}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="mb-3 flex items-center gap-2">
                <Car className="h-4 w-4 text-amber-500 dark:text-amber-300" aria-hidden="true" />
                <h3 className="text-sm font-black text-zinc-950 dark:text-white">Available vehicle types</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {OPERATIONAL_VEHICLE_TYPES.map((type) => (
                  <label
                    key={type}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-xl border px-3 py-3 text-sm font-bold transition-colors',
                      draft.enabledVehicleTypes.includes(type)
                        ? 'border-amber-400 bg-amber-50 text-zinc-950 dark:bg-amber-400/10 dark:text-amber-100'
                        : 'border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600'
                    )}
                  >
                    {vehicleLabel(type)}
                    <input
                      type="checkbox"
                      checked={draft.enabledVehicleTypes.includes(type)}
                      onChange={() => setDraft((current) => toggleVehicleType(current, type))}
                      className="h-4 w-4 accent-amber-400"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </AdminPanel>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-950/70 text-red-200">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-white">Delete operational zone?</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  This will permanently remove this city from service control. Existing bookings should not be deleted.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className={adminSecondaryButtonClassName}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void deleteZone()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {isDeleting ? 'Deleting...' : 'Delete zone'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ZoneListButton({
  zone,
  selected,
  disabled,
  onSelect,
  onToggleStatus,
}: {
  zone: SerializedOperationalZone;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-3 transition-colors',
        selected
          ? 'border-amber-400 bg-amber-50 dark:bg-amber-400/10'
          : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
      )}
    >
      <button type="button" onClick={onSelect} className="flex w-full min-w-0 items-start gap-3 text-left">
        <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', statusDotClassName(zone.status))} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-zinc-950 dark:text-white">{zone.city}</span>
          <span className="mt-1 block truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {zone.serviceRadiusKm} km service radius
          </span>
          <span className="mt-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500">{statusLabel(zone.status)}</span>
        </span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggleStatus}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-700 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-600"
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        {zone.status === 'DISABLED' ? 'Enable zone' : 'Disable zone'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function ToggleCard({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <span className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-amber-300">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="text-sm font-black text-zinc-950 dark:text-white">{label}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-amber-400" />
    </label>
  );
}

function toDraft(zone: SerializedOperationalZone): ZoneDraft {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...draft } = zone;
  return draft;
}

function sortZones(a: SerializedOperationalZone, b: SerializedOperationalZone) {
  return a.city.localeCompare(b.city);
}

function toggleVehicleType(draft: ZoneDraft, type: OperationalVehicleType): ZoneDraft {
  const exists = draft.enabledVehicleTypes.includes(type);
  const next = exists
    ? draft.enabledVehicleTypes.filter((item) => item !== type)
    : [...draft.enabledVehicleTypes, type];
  return { ...draft, enabledVehicleTypes: next.length > 0 ? next : draft.enabledVehicleTypes };
}

function statusLabel(status: ZoneDraft['status']) {
  if (status === 'LIMITED') return 'Limited';
  if (status === 'DISABLED') return 'Disabled';
  return 'Enabled';
}

function statusDotClassName(status: ZoneDraft['status']) {
  if (status === 'LIMITED') return 'bg-amber-400';
  if (status === 'DISABLED') return 'bg-red-500';
  return 'bg-emerald-400';
}

function vehicleLabel(type: OperationalVehicleType) {
  if (type === 'SUV') return 'SUV';
  if (type === 'PREMIUM') return 'Premium';
  return 'Sedan';
}
