'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Car,
  MapPin,
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
  type SerializedServiceControlConfig,
  type SerializedOperationalZone,
} from '@/lib/operationalZoneRules';
import { cn } from '@/lib/utils';

type ZoneDraft = Omit<SerializedOperationalZone, 'createdAt' | 'updatedAt'>;

const emptyZoneDraft: ZoneDraft = {
  id: '',
  city: '',
  centerLat: null,
  centerLng: null,
  status: 'ENABLED',
  serviceRadiusKm: 50,
  airportEnabled: true,
  outstationEnabled: true,
  autoDispatchEnabled: true,
  enabledVehicleTypes: ['SEDAN'],
};

type CitySuggestion = {
  id: string;
  label: string;
  city: string;
  latitude: number;
  longitude: number;
};

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? '';
type SaveDraftErrorTarget = 'toast' | 'modal';
type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error';
};

export function OperationsControl({
  initialZones,
  initialConfig,
}: {
  initialZones: SerializedOperationalZone[];
  initialConfig: SerializedServiceControlConfig;
}) {
  const router = useRouter();
  const [zones, setZones] = useState(initialZones);
  const [config, setConfig] = useState(initialConfig);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(initialZones[0]?.id ?? 'new');
  const [draft, setDraft] = useState<ZoneDraft>(initialZones[0] ? toDraft(initialZones[0]) : emptyZoneDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SerializedOperationalZone | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [isCitySearching, setIsCitySearching] = useState(false);
  const [citySearchError, setCitySearchError] = useState<string | null>(null);
  const [areaMapDraft, setAreaMapDraft] = useState<ZoneDraft | null>(null);
  const [areaMapError, setAreaMapError] = useState<string | null>(null);

  const isNewZone = selectedId === 'new';
  const selectedZone = zones.find((zone) => zone.id === selectedId) ?? null;
  const filteredZones = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return zones;
    return zones.filter((zone) => zone.city.toLowerCase().includes(needle));
  }, [query, zones]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.type === 'error' ? 3000 : 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function showToast(message: string, type: ToastMessage['type'] = 'success') {
    setToast({ id: Date.now(), message, type });
  }

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
    setCitySearch('');
    setCitySuggestions([]);
    setCitySearchError(null);
    setAreaMapError(null);
    setIsAddModalOpen(true);
  }

  async function saveConfig(nextAllowIndiaWideBooking: boolean) {
    setIsSaving(true);
    setToast(null);

    try {
      const response = await fetch('/api/admin/operational-zones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ allowIndiaWideBooking: nextAllowIndiaWideBooking }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Could not update service control.');
      }

      setConfig({ allowIndiaWideBooking: nextAllowIndiaWideBooking });
      showToast('Service setting updated.');
      router.refresh();
    } catch (error) {
      showToast((error as Error).message || 'Could not update service control.', 'error');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveDraft(nextDraft = draft, errorTarget: SaveDraftErrorTarget = 'toast') {
    if (!hasValidAreaCoordinates(nextDraft)) {
      const message = 'Please select a valid city from suggestions.';
      if (errorTarget === 'modal') {
        setAreaMapError(message);
      } else {
        showToast(message, 'error');
      }
      return;
    }

    const draftToSave = {
      ...nextDraft,
      city: nextDraft.city.trim(),
      serviceRadiusKm: clampRadius(nextDraft.serviceRadiusKm),
    };
    setIsSaving(true);
    if (errorTarget === 'modal') {
      setAreaMapError(null);
    } else {
      setToast(null);
    }

    try {
      const response = await fetch('/api/admin/operational-zones', {
        method: isNewZone ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(draftToSave),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (errorTarget === 'modal') {
          throw new Error(getMapModalSaveErrorMessage(response.status));
        }
        throw new Error(payload.error || 'Could not save service area.');
      }

      const saved = payload.data as SerializedOperationalZone;
      setZones((current) => {
        if (isNewZone) return [saved, ...current].sort(sortZones);
        return current.map((zone) => (zone.id === saved.id ? saved : zone)).sort(sortZones);
      });
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      showToast(isNewZone ? 'Service area saved.' : 'Service area updated.');
      setIsAddModalOpen(false);
      setAreaMapDraft(null);
      setAreaMapError(null);
      router.refresh();
    } catch (error) {
      if (errorTarget === 'modal') {
        setAreaMapError((error as Error).message || 'Unable to save service area. Please try again.');
      } else {
        showToast((error as Error).message || 'Could not save service area.', 'error');
      }
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
        credentials: 'include',
        body: JSON.stringify({ id: zone.id, status }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Could not update service area status.');
      }

      const saved = payload.data as SerializedOperationalZone;
      setZones((current) => current.map((item) => (item.id === saved.id ? saved : item)).sort(sortZones));
      if (selectedId === saved.id) setDraft(toDraft(saved));
      showToast('Service area updated.');
      router.refresh();
    } catch (error) {
      showToast((error as Error).message || 'Could not update service area status.', 'error');
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
        credentials: 'include',
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Could not delete service area.');
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
      showToast('Service area deleted.');
      router.refresh();
    } catch (error) {
      showToast((error as Error).message || 'Could not delete service area.', 'error');
    } finally {
      setIsDeleting(false);
    }
  }

  async function searchCities(value: string) {
    setCitySearch(value);
    setCitySuggestions([]);
    setCitySearchError(null);

    if (value.trim().length < 3) {
      return;
    }

    setIsCitySearching(true);
    try {
      const suggestions = await fetchCitySuggestions(value);
      setCitySuggestions(suggestions);
      if (suggestions.length === 0) {
        setCitySearchError('Please select a valid city from suggestions.');
      }
    } catch {
      setCitySuggestions([]);
      setCitySearchError('Please select a valid city from suggestions.');
    } finally {
      setIsCitySearching(false);
    }
  }

  function selectCitySuggestion(suggestion: CitySuggestion) {
    const nextDraft = {
      ...draft,
      city: suggestion.city,
      centerLat: suggestion.latitude,
      centerLng: suggestion.longitude,
      serviceRadiusKm: draft.serviceRadiusKm || 50,
    };
    setDraft((current) => ({
      ...current,
      city: suggestion.city,
      centerLat: suggestion.latitude,
      centerLng: suggestion.longitude,
      serviceRadiusKm: current.serviceRadiusKm || 50,
    }));
    setCitySearch(suggestion.label);
    setCitySuggestions([]);
    setCitySearchError(null);
    setToast(null);
    setIsAddModalOpen(false);
    setAreaMapDraft(nextDraft);
    setAreaMapError(null);
  }

  function openAreaMapEditor() {
    if (!hasValidAreaCoordinates(draft)) {
      setAreaMapError('Please select a valid city from suggestions.');
      setIsAddModalOpen(true);
      return;
    }

    setAreaMapDraft({ ...draft, serviceRadiusKm: clampRadius(draft.serviceRadiusKm) });
    setToast(null);
    setAreaMapError(null);
  }

  function updateAreaMapDraft(updates: Partial<ZoneDraft>) {
    setAreaMapDraft((current) => (current ? { ...current, ...updates } : current));
    setAreaMapError(null);
  }

  async function saveAreaMapDraft() {
    if (!areaMapDraft) return;
    await saveDraft(areaMapDraft, 'modal');
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500 dark:text-amber-300">Dispatch Module</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Service Control</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Control where customers can book rides and how service areas are handled.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewZone}
            disabled={isSaving || isDeleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add service area
          </button>
        </div>
      </div>

      <AdminPanel className="shrink-0 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-zinc-950 dark:text-white">India-wide Booking Control</h2>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em]',
                  config.allowIndiaWideBooking
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-amber-400/15 text-amber-300'
                )}
              >
                {config.allowIndiaWideBooking ? 'All India Enabled' : 'Limited Service Areas'}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {config.allowIndiaWideBooking
                ? 'Customers can request rides from any Indian pickup location.'
                : 'Bookings are allowed only inside enabled or limited service areas.'}
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <span className="text-sm font-black text-zinc-950 dark:text-white">Allow bookings across India</span>
            <input
              type="checkbox"
              checked={config.allowIndiaWideBooking}
              disabled={isSaving}
              onChange={(event) => void saveConfig(event.target.checked)}
              className="h-5 w-5 accent-amber-400"
            />
          </label>
        </div>
      </AdminPanel>

      {toast ? (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-5 right-5 z-[80] w-[min(360px,calc(100vw-2rem))] rounded-2xl border px-4 py-3 text-sm font-black shadow-2xl transition-all',
            toast.type === 'error'
              ? 'border-red-900/70 bg-red-950 text-red-100 shadow-red-950/30'
              : 'border-emerald-500/30 bg-emerald-950 text-emerald-100 shadow-emerald-950/20'
          )}
        >
          {toast.message}
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
                    <p>No service areas yet.</p>
                    <button
                      type="button"
                      onClick={startNewZone}
                      className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                    >
                      Add service area
                    </button>
                  </div>
                ) : (
                  'No service areas match this search.'
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
              <h2 className="text-lg font-black text-zinc-950 dark:text-white">{isNewZone ? 'Add service area' : draft.city}</h2>
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
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete area
                </button>
              ) : null}
              <button type="button" disabled={isSaving || isDeleting} onClick={startNewZone} className={adminSecondaryButtonClassName}>
                <RotateCcw className="mr-2 inline h-4 w-4" aria-hidden="true" />
                Reset
              </button>
              <button
                type="button"
                disabled={isSaving || isDeleting || !hasValidAreaCoordinates(draft)}
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
                  readOnly
                  className={adminInputClassName}
                  placeholder="Select a city from suggestions"
                />
              </Field>
              <Field label="Status">
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
            </div>

            <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                  Service radius: {draft.serviceRadiusKm} km
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={300}
                    value={draft.serviceRadiusKm}
                    onChange={(event) => setDraft((current) => ({ ...current, serviceRadiusKm: clampRadius(Number(event.target.value)) }))}
                    className="min-w-0 flex-1 accent-amber-400"
                  />
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={draft.serviceRadiusKm}
                    onChange={(event) => setDraft((current) => ({ ...current, serviceRadiusKm: clampRadius(Number(event.target.value)) }))}
                    className={cn(adminInputClassName, 'w-24 shrink-0')}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={openAreaMapEditor}
                disabled={isSaving || isDeleting}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-black text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100 dark:hover:bg-amber-400/20"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Edit area on map
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
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

      {isAddModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="dashboard-scrollbar max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white">Add service area</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Search a city, store its center coordinates, then choose a service radius.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className={adminSecondaryButtonClassName}
              >
                Close
              </button>
            </div>

            <div className="mt-5">
              <Field label="City search">
                <input
                  value={citySearch}
                  onChange={(event) => void searchCities(event.target.value)}
                  className={adminInputClassName}
                  placeholder="Search city in India"
                />
              </Field>
              <div className="mt-3 space-y-2">
                {isCitySearching ? (
                  <div className="rounded-xl border border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-400">
                    Searching cities...
                  </div>
                ) : null}
                {citySearchError ? (
                  <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm font-semibold text-red-200">
                    {citySearchError}
                  </div>
                ) : null}
                {citySuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => selectCitySuggestion(suggestion)}
                    className="flex w-full items-start gap-3 rounded-xl border border-zinc-800 px-3 py-3 text-left transition-colors hover:border-amber-400 hover:bg-zinc-900"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-zinc-100">{suggestion.city}</span>
                      <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-500">{suggestion.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {draft.city ? (
              <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                <p className="text-sm font-black text-amber-100">Selected city: {draft.city}</p>
                <p className="mt-1 text-xs font-semibold text-amber-200/80">
                  {typeof draft.centerLat === 'number' && typeof draft.centerLng === 'number'
                    ? `${draft.centerLat.toFixed(5)}, ${draft.centerLng.toFixed(5)}`
                    : 'Coordinates not selected yet'}
                </p>
                <div className="mt-4">
                  <Field label={`Service radius: ${draft.serviceRadiusKm} km`}>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={5}
                        max={300}
                        value={draft.serviceRadiusKm}
                        onChange={(event) => setDraft((current) => ({ ...current, serviceRadiusKm: clampRadius(Number(event.target.value)) }))}
                        className="min-w-0 flex-1 accent-amber-400"
                      />
                      <input
                        type="number"
                        min={5}
                        max={300}
                        value={draft.serviceRadiusKm}
                        onChange={(event) => setDraft((current) => ({ ...current, serviceRadiusKm: clampRadius(Number(event.target.value)) }))}
                        className={cn(adminInputClassName, 'w-24')}
                      />
                    </div>
                  </Field>
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className={adminSecondaryButtonClassName}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!hasValidAreaCoordinates(draft)}
                onClick={openAreaMapEditor}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-black text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MapPin className="h-4 w-4" aria-hidden="true" />
                Edit on map
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {areaMapDraft ? (
        <ServiceAreaMapModal
          draft={areaMapDraft}
          error={areaMapError}
          isSaving={isSaving}
          onCancel={() => {
            setAreaMapDraft(null);
            setAreaMapError(null);
          }}
          onChange={updateAreaMapDraft}
          onSave={() => void saveAreaMapDraft()}
        />
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-950/70 text-red-200">
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-black text-white">Delete service area?</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  This removes the area from future booking availability. Existing bookings will stay unchanged.
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
                {isDeleting ? 'Deleting...' : 'Delete area'}
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
        {zone.status === 'DISABLED' ? 'Enable area' : 'Disable area'}
      </button>
    </div>
  );
}

function ServiceAreaMapModal({
  draft,
  error,
  isSaving,
  onCancel,
  onChange,
  onSave,
}: {
  draft: ZoneDraft;
  error: string | null;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (updates: Partial<ZoneDraft>) => void;
  onSave: () => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('maplibre-gl').Map | null>(null);
  const markerRef = useRef<import('maplibre-gl').Marker | null>(null);
  const isDraggingMarkerRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const hasCoordinates = hasValidAreaCoordinates(draft);
  const radius = clampRadius(draft.serviceRadiusKm);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!hasCoordinates || !mapContainerRef.current) {
      return;
    }

    let isMounted = true;

    const initMap = async () => {
      const maplibregl = await import('maplibre-gl');

      if (!isMounted || !mapContainerRef.current || !hasValidAreaCoordinates(draft)) {
        return;
      }

      const center: [number, number] = [draft.centerLng, draft.centerLat];
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center,
        zoom: getRadiusZoom(radius),
        attributionControl: false,
      });

      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      const markerElement = document.createElement('div');
      markerElement.className = 'h-7 w-7 rounded-full border-4 border-white bg-amber-400 shadow-xl shadow-black/40 ring-4 ring-amber-400/25';
      markerElement.style.cursor = 'grab';

      const updateCenterFromMarker = () => {
        const marker = markerRef.current;
        if (!marker) return;
        const lngLat = marker.getLngLat();
        onChangeRef.current({
          centerLat: Number(lngLat.lat.toFixed(6)),
          centerLng: Number(lngLat.lng.toFixed(6)),
        });
      };

      markerRef.current = new maplibregl.Marker({ element: markerElement, draggable: true })
        .setLngLat(center)
        .addTo(map);
      markerRef.current.on('dragstart', () => {
        isDraggingMarkerRef.current = true;
        markerElement.style.cursor = 'grabbing';
      });
      markerRef.current.on('drag', updateCenterFromMarker);
      markerRef.current.on('dragend', () => {
        isDraggingMarkerRef.current = false;
        markerElement.style.cursor = 'grab';
        updateCenterFromMarker();
      });

      map.on('load', () => {
        if (!mapRef.current || !hasValidAreaCoordinates(draft)) return;
        const circle = createRadiusCircleFeature(draft.centerLat, draft.centerLng, radius);
        map.addSource('service-radius', {
          type: 'geojson',
          data: circle,
        });
        map.addLayer({
          id: 'service-radius-fill',
          type: 'fill',
          source: 'service-radius',
          paint: {
            'fill-color': '#f59e0b',
            'fill-opacity': 0.18,
          },
        });
        map.addLayer({
          id: 'service-radius-line',
          type: 'line',
          source: 'service-radius',
          paint: {
            'line-color': '#f59e0b',
            'line-width': 2,
            'line-opacity': 0.9,
          },
        });
        map.resize();
      });
    };

    void initMap();

    return () => {
      isMounted = false;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [hasCoordinates]);

  useEffect(() => {
    if (!mapRef.current || !hasValidAreaCoordinates(draft)) return;

    const center: [number, number] = [draft.centerLng, draft.centerLat];
    if (!isDraggingMarkerRef.current) {
      markerRef.current?.setLngLat(center);
      mapRef.current.easeTo({ center, zoom: getRadiusZoom(radius), duration: 180 });
    }

    const source = mapRef.current.getSource('service-radius') as import('maplibre-gl').GeoJSONSource | undefined;
    source?.setData(createRadiusCircleFeature(draft.centerLat, draft.centerLng, radius));
  }, [draft.centerLat, draft.centerLng, radius]);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 px-4 py-6">
      <div className="dashboard-scrollbar flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-zinc-800 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Service area map</p>
            <h3 className="mt-1 text-xl font-black text-white">{draft.city || 'Select service area'}</h3>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Adjust the service radius around the selected city center.
            </p>
            <p className="mt-1 text-xs font-semibold text-zinc-500">Drag the marker to adjust the service center.</p>
          </div>
          <button type="button" onClick={onCancel} className={adminSecondaryButtonClassName}>
            Cancel
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-h-[320px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            {hasCoordinates ? (
              <div ref={mapContainerRef} className="h-[340px] w-full lg:h-full lg:min-h-[460px]" />
            ) : (
              <div className="flex h-[340px] flex-col items-center justify-center px-6 text-center lg:min-h-[460px]">
                <MapPin className="h-8 w-8 text-amber-300" aria-hidden="true" />
                <p className="mt-3 text-sm font-bold text-zinc-300">Please select a valid city from suggestions.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Selected city</p>
              <p className="mt-2 text-sm font-black text-white">{draft.city || 'No city selected'}</p>
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                {hasCoordinates ? `${draft.centerLat.toFixed(5)}, ${draft.centerLng.toFixed(5)}` : 'No coordinates stored'}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">
                  Service radius: {radius} km
                </span>
                <input
                  type="range"
                  min={5}
                  max={300}
                  value={radius}
                  onChange={(event) => onChange({ serviceRadiusKm: clampRadius(Number(event.target.value)) })}
                  className="mt-4 w-full accent-amber-400"
                />
              </label>
              <div className="mt-4 flex items-center gap-3">
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={radius}
                  onChange={(event) => onChange({ serviceRadiusKm: clampRadius(Number(event.target.value)) })}
                  className={cn(adminInputClassName, 'w-28')}
                />
                <span className="text-sm font-bold text-zinc-400">km</span>
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-200">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row lg:flex-col-reverse">
              <button type="button" onClick={onCancel} className={adminSecondaryButtonClassName}>
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || !hasCoordinates}
                onClick={onSave}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                {isSaving ? 'Saving...' : 'Save service area'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
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

function getMapModalSaveErrorMessage(status: number) {
  if (status === 401) return 'Session expired. Please log in again.';
  return 'Unable to save service area. Please try again.';
}

function hasValidAreaCoordinates(draft: Pick<ZoneDraft, 'city' | 'centerLat' | 'centerLng'>): draft is ZoneDraft & {
  centerLat: number;
  centerLng: number;
} {
  return Boolean(
    draft.city.trim() &&
    typeof draft.centerLat === 'number' &&
    Number.isFinite(draft.centerLat) &&
    typeof draft.centerLng === 'number' &&
    Number.isFinite(draft.centerLng)
  );
}

function clampRadius(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.min(300, Math.max(5, Math.round(value)));
}

function getRadiusZoom(radiusKm: number) {
  if (radiusKm <= 10) return 10;
  if (radiusKm <= 25) return 9;
  if (radiusKm <= 60) return 8;
  if (radiusKm <= 130) return 7;
  return 6;
}

function createRadiusCircleFeature(latitude: number, longitude: number, radiusKm: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const steps = 96;
  const earthRadiusKm = 6371;
  const latRad = toRadians(latitude);
  const lngRad = toRadians(longitude);
  const angularDistance = radiusKm / earthRadiusKm;
  const coordinates: Array<[number, number]> = [];

  for (let index = 0; index <= steps; index += 1) {
    const bearing = (2 * Math.PI * index) / steps;
    const pointLat = Math.asin(
      Math.sin(latRad) * Math.cos(angularDistance) +
        Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const pointLng =
      lngRad +
      Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latRad),
        Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(pointLat)
      );

    coordinates.push([toDegrees(pointLng), toDegrees(pointLat)]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

async function fetchCitySuggestions(query: string): Promise<CitySuggestion[]> {
  if (GEOAPIFY_API_KEY) {
    const params = new URLSearchParams({
      text: query,
      format: 'json',
      limit: '5',
      lang: 'en',
      filter: 'countrycode:in',
      apiKey: GEOAPIFY_API_KEY,
    });
    const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`);

    if (!response.ok) {
      throw new Error('City search failed');
    }

    const data = (await response.json()) as {
      results?: Array<{
        formatted?: string;
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        county?: string;
        state?: string;
        lat?: number;
        lon?: number;
        place_id?: string;
      }>;
    };

    return (data.results ?? [])
      .map((result, index) => {
        const city = result.city || result.town || result.municipality || result.county || result.village || '';
        if (!city || typeof result.lat !== 'number' || typeof result.lon !== 'number') return null;
        return {
          id: result.place_id || `${city}-${index}`,
          label: result.formatted || [city, result.state, 'India'].filter(Boolean).join(', '),
          city,
          latitude: Number(result.lat.toFixed(6)),
          longitude: Number(result.lon.toFixed(6)),
        };
      })
      .filter((suggestion): suggestion is CitySuggestion => Boolean(suggestion));
  }

  const params = new URLSearchParams({
    q: `${query}, India`,
    format: 'jsonv2',
    limit: '5',
    addressdetails: '1',
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('City search failed');
  }

  const data = (await response.json()) as Array<{
    place_id?: number;
    display_name?: string;
    lat?: string;
    lon?: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      county?: string;
    };
  }>;

  return data
    .map((result, index) => {
      const city =
        result.address?.city ||
        result.address?.town ||
        result.address?.municipality ||
        result.address?.county ||
        result.address?.village ||
        '';
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      if (!city || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return {
        id: String(result.place_id ?? `${city}-${index}`),
        label: result.display_name || city,
        city,
        latitude: Number(latitude.toFixed(6)),
        longitude: Number(longitude.toFixed(6)),
      };
    })
    .filter((suggestion): suggestion is CitySuggestion => Boolean(suggestion));
}
