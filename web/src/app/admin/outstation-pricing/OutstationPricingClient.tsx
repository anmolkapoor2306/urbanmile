'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Calculator, CheckCircle2, Plus, RotateCcw, Search } from 'lucide-react';
import {
  AdminPanel,
  AdminStatCard,
  AdminStatsGrid,
  adminInputClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/AdminLayout';
import { calculateSuggestedFare, OUTSTATION_SUGGESTED_RATE_PER_KM } from '@/lib/outstationPricing';
import { cn } from '@/lib/utils';

type SerializedOutstationRoute = {
  id: string;
  originCity: string;
  destinationCity: string;
  originAliases: string[];
  destinationAliases: string[];
  sedanFare: number;
  suvMarkup: number;
  estimatedKm: number | null;
  suggestedFare: number | null;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type RouteFormState = {
  id: string;
  originCity: string;
  destinationCity: string;
  originAliases: string;
  destinationAliases: string;
  sedanFare: string;
  suvMarkup: string;
  estimatedKm: string;
  isActive: boolean;
  notes: string;
};

const emptyForm: RouteFormState = {
  id: '',
  originCity: 'Jalandhar',
  destinationCity: '',
  originAliases: '',
  destinationAliases: '',
  sedanFare: '',
  suvMarkup: '1000',
  estimatedKm: '',
  isActive: true,
  notes: '',
};

function formatMoney(value: number | null) {
  if (value === null) return 'Not set';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function toAliasText(aliases: string[]) {
  return aliases.join(', ');
}

function parseAliases(value: string) {
  return value
    .split(',')
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function routeToForm(route: SerializedOutstationRoute): RouteFormState {
  return {
    id: route.id,
    originCity: route.originCity,
    destinationCity: route.destinationCity,
    originAliases: toAliasText(route.originAliases),
    destinationAliases: toAliasText(route.destinationAliases),
    sedanFare: String(route.sedanFare),
    suvMarkup: String(route.suvMarkup),
    estimatedKm: route.estimatedKm === null ? '' : String(route.estimatedKm),
    isActive: route.isActive,
    notes: route.notes,
  };
}

export function OutstationPricingClient({
  initialRoutes,
  databaseError,
}: {
  initialRoutes: SerializedOutstationRoute[];
  databaseError?: string | null;
}) {
  const [routes, setRoutes] = useState(initialRoutes);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState<RouteFormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredRoutes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return routes.filter((route) => {
      const haystack = [
        route.originCity,
        route.destinationCity,
        ...route.originAliases,
        ...route.destinationAliases,
      ].join(' ').toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && route.isActive) ||
        (statusFilter === 'inactive' && !route.isActive);

      return matchesQuery && matchesStatus;
    });
  }, [query, routes, statusFilter]);

  const suggestedFare = calculateSuggestedFare(form.estimatedKm ? Number(form.estimatedKm) : null);

  function resetForm() {
    setForm(emptyForm);
    setError(null);
    setMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      id: form.id || undefined,
      originCity: form.originCity,
      destinationCity: form.destinationCity,
      originAliases: parseAliases(form.originAliases),
      destinationAliases: parseAliases(form.destinationAliases),
      sedanFare: Number(form.sedanFare),
      suvMarkup: Number(form.suvMarkup),
      estimatedKm: form.estimatedKm ? Number(form.estimatedKm) : null,
      isActive: form.isActive,
      notes: form.notes || null,
    };

    try {
      const response = await fetch('/api/admin/outstation-routes', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Could not save route');
        return;
      }

      const savedRoute = data.data as SerializedOutstationRoute;
      setRoutes((currentRoutes) => {
        const existing = currentRoutes.some((route) => route.id === savedRoute.id);
        if (existing) {
          return currentRoutes.map((route) => route.id === savedRoute.id ? savedRoute : route);
        }

        return [savedRoute, ...currentRoutes];
      });
      setForm(routeToForm(savedRoute));
      setMessage('Outstation route saved');
    } catch {
      setError('Could not save route');
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleRoute(route: SerializedOutstationRoute) {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/outstation-routes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: route.id, isActive: !route.isActive }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Could not update route');
        return;
      }

      const savedRoute = data.data as SerializedOutstationRoute;
      setRoutes((currentRoutes) => currentRoutes.map((item) => item.id === savedRoute.id ? savedRoute : item));
    } catch {
      setError('Could not update route');
    } finally {
      setIsSaving(false);
    }
  }

  if (databaseError) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-900/50 dark:bg-red-950/20">
        <div>
          <h2 className="text-lg font-black text-red-800 dark:text-red-200">
            Outstation table not ready
          </h2>
          <p className="mt-2 max-w-lg text-sm text-red-600 dark:text-red-300/80">
            The outstation routes database table doesn&rsquo;t exist yet. Run the pending Prisma migration to create it:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-red-100/80 px-4 py-2 text-xs font-bold text-red-800 dark:bg-red-900/40 dark:text-red-200">
            npx prisma migrate deploy
          </pre>
          <p className="mt-3 text-xs text-red-500 dark:text-red-400">
            {databaseError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <AdminStatsGrid className="md:grid-cols-4">
        <AdminStatCard label="Routes" value={routes.length} />
        <AdminStatCard label="Active" value={routes.filter((route) => route.isActive).length} />
        <AdminStatCard label="Inactive" value={routes.filter((route) => !route.isActive).length} />
        <AdminStatCard label="Suggestion Rate" value={`₹${OUTSTATION_SUGGESTED_RATE_PER_KM}/km`} />
      </AdminStatsGrid>

      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdminPanel className="flex min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl font-black text-zinc-950 dark:text-white">Outstation Pricing</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Fixed customer fares for supported outstation one-way routes.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_160px_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search city or alias"
                    className={cn(adminInputClassName, 'pl-9')}
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={adminInputClassName}
                >
                  <option value="all">All routes</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button type="button" onClick={resetForm} className={adminSecondaryButtonClassName}>
                  <Plus className="mr-2 inline h-4 w-4" />
                  Add Route
                </button>
              </div>
            </div>
          </div>

          <div className="dashboard-scrollbar min-h-0 flex-1 overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50 text-xs uppercase tracking-[0.14em] text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Route</th>
                  <th className="px-5 py-3">Fare</th>
                  <th className="px-5 py-3">Aliases</th>
                  <th className="px-5 py-3">Suggested</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredRoutes.length === 0 && routes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-zinc-400 dark:text-zinc-500">
                      No outstation routes found. Add your first route.
                    </td>
                  </tr>
                ) : filteredRoutes.length === 0 && routes.length > 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-sm text-zinc-400 dark:text-zinc-500">
                      No routes match your search or filter.
                    </td>
                  </tr>
                ) : null}
                {filteredRoutes.map((route) => (
                  <tr key={route.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-900/70">
                    <td className="px-5 py-4">
                      <div className="font-black text-zinc-950 dark:text-white">
                        {route.originCity} to {route.destinationCity}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{route.notes || 'No notes'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-zinc-950 dark:text-white">Eco {formatMoney(route.sedanFare)}</div>
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        XL {formatMoney(route.sedanFare + route.suvMarkup)}
                      </div>
                    </td>
                    <td className="max-w-[260px] px-5 py-4 text-xs text-zinc-600 dark:text-zinc-400">
                      <div className="line-clamp-2">Origin: {toAliasText(route.originAliases)}</div>
                      <div className="mt-1 line-clamp-2">Destination: {toAliasText(route.destinationAliases)}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200">{formatMoney(route.suggestedFare)}</div>
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {route.estimatedKm ? `${route.estimatedKm} km` : 'No km set'}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-1 text-xs font-black',
                        route.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      )}>
                        {route.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setForm(routeToForm(route))} className={adminSecondaryButtonClassName}>
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRoute(route)}
                          disabled={isSaving}
                          className={adminSecondaryButtonClassName}
                        >
                          {route.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="dashboard-scrollbar min-h-0 overflow-y-auto p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-zinc-950 dark:text-white">
                {form.id ? 'Edit Route' : 'Add Route'}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Suggested fare is guidance only. Customer fare uses saved sedan fare.
              </p>
            </div>
            <button type="button" onClick={resetForm} className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-zinc-400">Origin city</span>
                <input value={form.originCity} onChange={(event) => setForm({ ...form, originCity: event.target.value })} className={adminInputClassName} required />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-zinc-400">Destination city</span>
                <input value={form.destinationCity} onChange={(event) => setForm({ ...form, destinationCity: event.target.value })} className={adminInputClassName} required />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-zinc-400">Origin aliases</span>
              <input value={form.originAliases} onChange={(event) => setForm({ ...form, originAliases: event.target.value })} className={adminInputClassName} placeholder="Jal, Jalandhar" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-zinc-400">Destination aliases</span>
              <input value={form.destinationAliases} onChange={(event) => setForm({ ...form, destinationAliases: event.target.value })} className={adminInputClassName} placeholder="Chd, Chandigarh" />
            </label>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-zinc-400">Sedan fare</span>
                <input type="number" min="1" value={form.sedanFare} onChange={(event) => setForm({ ...form, sedanFare: event.target.value })} className={adminInputClassName} required />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-zinc-400">SUV markup</span>
                <input type="number" min="0" value={form.suvMarkup} onChange={(event) => setForm({ ...form, suvMarkup: event.target.value })} className={adminInputClassName} required />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-zinc-400">Estimated km</span>
                <input type="number" min="0" step="0.1" value={form.estimatedKm} onChange={(event) => setForm({ ...form, estimatedKm: event.target.value })} className={adminInputClassName} />
              </label>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2 text-sm font-black text-amber-900 dark:text-amber-100">
                <Calculator className="h-4 w-4" />
                Suggested fare: {formatMoney(suggestedFare)}
              </div>
              <p className="mt-1 text-xs font-semibold text-amber-800/80 dark:text-amber-200/80">
                Calculated as estimated km x ₹{OUTSTATION_SUGGESTED_RATE_PER_KM}. Save it as sedan fare only if approved.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-200">
              <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
              Active route
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-zinc-400">Notes</span>
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={cn(adminInputClassName, 'min-h-20 resize-none')} />
            </label>

            {message ? (
              <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-bold text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
                <CheckCircle2 className="mr-2 inline h-4 w-4" />
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSaving}
              className="flex min-h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              {isSaving ? 'Saving...' : form.id ? 'Save Route' : 'Add Route'}
            </button>
          </form>
        </AdminPanel>
      </div>
    </div>
  );
}
