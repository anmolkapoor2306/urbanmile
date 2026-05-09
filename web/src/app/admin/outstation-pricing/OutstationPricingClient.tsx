'use client';

import { CSSProperties, FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Calculator, CheckCircle2, Plus, RotateCcw, Search } from 'lucide-react';
import {
  AdminPanel,
  adminInputClassName,
  adminSecondaryButtonClassName,
} from '@/components/admin/AdminLayout';
import {
  calculateSuggestedFare,
  formatPricingCityTitle,
  normalizePricingCity,
  OUTSTATION_CITY_ALIASES,
  OUTSTATION_CITY_SUGGESTIONS,
  OUTSTATION_SUGGESTED_RATE_PER_KM,
} from '@/lib/outstationPricing';
import {
  cleanGeoapifyCityLocation,
  formatCityStateDisplay,
  getKnownIndianCityState,
  splitCityStateDisplay,
} from '@/lib/locationFormatting';
import { cn } from '@/lib/utils';

type SerializedOutstationRoute = {
  id: string;
  originCity: string;
  originState: string | null;
  destinationCity: string;
  destinationState: string | null;
  originAliases: string[];
  destinationAliases: string[];
  sedanFare: number;
  suvMarkup: number;
  estimatedKm: number | null;
  suggestedFare: number | null;
  isActive: boolean;
  isBidirectional: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type RouteFormState = {
  id: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  sedanFare: string;
  suvMarkup: string;
  estimatedKm: string;
  isActive: boolean;
  isBidirectional: boolean;
  notes: string;
};

type CitySuggestion = {
  id: string;
  label: string;
  city: string;
  state: string;
  displayName: string;
  description?: string;
  normalized: string;
  searchText: string;
};

type GeoapifyAutocompleteResult = {
  formatted?: string;
  lat?: number;
  lon?: number;
  place_id?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  suburb?: string;
  district?: string;
  state?: string;
  state_code?: string;
  country?: string;
  result_type?: string;
};

type GeoapifyAutocompleteResponse = {
  results?: GeoapifyAutocompleteResult[];
};

type RouteSearchIndex = {
  route: SerializedOutstationRoute;
  allText: string;
  originText: string;
  destinationText: string;
};

const emptyForm: RouteFormState = {
  id: '',
  originCity: 'Jalandhar',
  originState: 'Punjab',
  destinationCity: '',
  destinationState: '',
  sedanFare: '',
  suvMarkup: '1000',
  estimatedKm: '',
  isActive: true,
  isBidirectional: true,
  notes: '',
};

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? '';
const CITY_RESULT_TYPES = new Set(['city', 'county', 'state', 'postcode', 'district', 'suburb', 'locality']);

function formatMoney(value: number | null) {
  if (value === null) return 'Not set';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCityLabel(city: string) {
  return formatPricingCityTitle(city);
}

function formatRouteCityInput(city: string, state: string | null | undefined) {
  return state ? formatCityStateDisplay(city, state) : city;
}

function parseRouteCityInput(value: string) {
  const parsed = splitCityStateDisplay(value);

  if (value.includes(',')) {
    return parsed;
  }

  return {
    city: value,
    state: '',
    displayName: value,
  };
}

function createCitySuggestionMap(routes: SerializedOutstationRoute[]) {
  const suggestionMap = new Map<string, { label: string; state: string; aliases: Set<string> }>();

  function addCity(city: string, aliases: string[] = [], state?: string | null) {
    const normalized = normalizePricingCity(city);
    if (!normalized) {
      return;
    }

    const current = suggestionMap.get(normalized) ?? {
      label: formatCityLabel(normalized),
      state: state || getKnownIndianCityState(normalized),
      aliases: new Set<string>(),
    };

    current.state ||= state || getKnownIndianCityState(normalized);
    current.aliases.add(normalized);
    aliases.forEach((alias) => current.aliases.add(alias.toLowerCase()));
    suggestionMap.set(normalized, current);
  }

  OUTSTATION_CITY_SUGGESTIONS.forEach((city) => addCity(city));
  Object.entries(OUTSTATION_CITY_ALIASES).forEach(([alias, city]) => addCity(city, [alias]));
  routes.forEach((route) => {
    addCity(route.originCity, route.originAliases, route.originState);
    addCity(route.destinationCity, route.destinationAliases, route.destinationState);
  });

  return Array.from(suggestionMap.entries())
    .map(([normalized, suggestion]) => {
      const displayName = formatCityStateDisplay(suggestion.label, suggestion.state);

      return {
        id: `local-${normalized}`,
        label: suggestion.label,
        city: suggestion.label,
        state: suggestion.state,
        displayName,
        description: suggestion.state,
        normalized,
        searchText: [suggestion.label, suggestion.state, displayName, normalized, ...suggestion.aliases]
          .join(' ')
          .toLowerCase(),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

function filterCitySuggestions(suggestions: CitySuggestion[], value: string) {
  const cleanedValue = value.toLowerCase().replace(/\s+/g, ' ').trim();
  const normalizedValue = normalizePricingCity(value);

  if (!cleanedValue) {
    return suggestions.slice(0, 8);
  }

  return suggestions
    .filter((suggestion) => (
      suggestion.searchText.includes(cleanedValue) ||
      suggestion.normalized.includes(normalizedValue)
    ))
    .slice(0, 8);
}

async function fetchGeoapifyCitySuggestions(query: string, signal: AbortSignal): Promise<CitySuggestion[]> {
  const params = new URLSearchParams({
    text: query,
    format: 'json',
    limit: '8',
    lang: 'en',
    filter: 'countrycode:in',
    apiKey: GEOAPIFY_API_KEY,
  });

  const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error('City autocomplete failed');
  }

  const data = (await response.json()) as GeoapifyAutocompleteResponse;

  return (data.results ?? [])
    .map(createGeoapifyCitySuggestion)
    .filter((suggestion): suggestion is CitySuggestion => Boolean(suggestion));
}

function createGeoapifyCitySuggestion(result: GeoapifyAutocompleteResult, index: number): CitySuggestion | null {
  const resultType = result.result_type?.toLowerCase();
  const location = cleanGeoapifyCityLocation(result);

  if (!location) {
    return null;
  }

  const isLikelyStreetAddress = Boolean(result.address_line1 && result.address_line1 !== result.city);
  if (isLikelyStreetAddress && resultType && !CITY_RESULT_TYPES.has(resultType)) {
    return null;
  }

  const normalized = normalizePricingCity(location.city);

  return {
    id: result.place_id || `geoapify-${normalized}-${index}`,
    label: location.city,
    city: location.city,
    state: location.state,
    displayName: location.displayName,
    description: location.state,
    normalized,
    searchText: [
      location.city,
      location.state,
      location.displayName,
      result.formatted,
      result.city,
      result.town,
      result.village,
      result.municipality,
      result.county,
      result.state,
      result.result_type,
    ].filter(Boolean).join(' ').toLowerCase(),
  };
}

function mergeCitySuggestions(localSuggestions: CitySuggestion[], remoteSuggestions: CitySuggestion[]) {
  const suggestionMap = new Map<string, CitySuggestion>();

  [...localSuggestions, ...remoteSuggestions].forEach((suggestion) => {
    if (!suggestionMap.has(suggestion.normalized)) {
      suggestionMap.set(suggestion.normalized, suggestion);
    }
  });

  return Array.from(suggestionMap.values()).slice(0, 8);
}

function createRouteSideSearchText(city: string, aliases: string[], state?: string | null) {
  return [city, state, formatCityStateDisplay(city, state), normalizePricingCity(city), ...aliases, ...aliases.map(normalizePricingCity)]
    .join(' ')
    .toLowerCase();
}

function createRouteSearchIndex(routes: SerializedOutstationRoute[]): RouteSearchIndex[] {
  return routes.map((route) => {
    const originText = createRouteSideSearchText(route.originCity, route.originAliases, route.originState);
    const destinationText = createRouteSideSearchText(route.destinationCity, route.destinationAliases, route.destinationState);

    return {
      route,
      originText,
      destinationText,
      allText: [originText, destinationText, route.notes].join(' ').toLowerCase(),
    };
  });
}

function sideMatchesFilter(sideText: string, filter: string) {
  const cleanedFilter = filter.toLowerCase().replace(/\s+/g, ' ').trim();

  if (!cleanedFilter) {
    return true;
  }

  const normalizedFilter = normalizePricingCity(filter);

  return sideText.includes(cleanedFilter) || sideText.includes(normalizedFilter);
}

function routeMatchesDirectionalFilters(index: RouteSearchIndex, fromFilter: string, toFilter: string) {
  const matchesForward =
    sideMatchesFilter(index.originText, fromFilter) &&
    sideMatchesFilter(index.destinationText, toFilter);

  if (matchesForward) {
    return true;
  }

  return (
    index.route.isBidirectional &&
    sideMatchesFilter(index.destinationText, fromFilter) &&
    sideMatchesFilter(index.originText, toFilter)
  );
}

function routeMatchesGeneralSearch(index: RouteSearchIndex, query: string) {
  const cleanedQuery = query.toLowerCase().replace(/\s+/g, ' ').trim();

  if (!cleanedQuery) {
    return true;
  }

  const normalizedQuery = normalizePricingCity(query);

  return index.allText.includes(cleanedQuery) || index.allText.includes(normalizedQuery);
}

function CityAutocompleteInput({
  label,
  value,
  onChange,
  onSuggestionSelect,
  suggestions,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSuggestionSelect: (suggestion: CitySuggestion) => void;
  suggestions: CitySuggestion[];
  required?: boolean;
}) {
  const listboxId = useId();
  const inputName = `${listboxId}-um-admin-rp`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [geoapifySuggestions, setGeoapifySuggestions] = useState<CitySuggestion[]>([]);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const localSuggestions = useMemo(
    () => filterCitySuggestions(suggestions, value),
    [suggestions, value]
  );
  const canLoadGeoapifySuggestions = Boolean(isOpen && value.trim().length >= 2 && GEOAPIFY_API_KEY);
  const visibleSuggestions = useMemo(
    () => mergeCitySuggestions(localSuggestions, canLoadGeoapifySuggestions ? geoapifySuggestions : []),
    [canLoadGeoapifySuggestions, geoapifySuggestions, localSuggestions]
  );

  function updateDropdownPosition() {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    setDropdownStyle({
      left: rect.left,
      top: rect.bottom + 4,
      width: rect.width,
    });
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const query = value.trim();

    if (!canLoadGeoapifySuggestions) {
      return;
    }

    const controller = new AbortController();
    const debounceTimer = window.setTimeout(async () => {
      setIsLoadingSuggestions(true);

      try {
        const remoteSuggestions = await fetchGeoapifyCitySuggestions(query, controller.signal);
        setGeoapifySuggestions(remoteSuggestions);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setGeoapifySuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(debounceTimer);
    };
  }, [canLoadGeoapifySuggestions, value]);

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-zinc-500 dark:text-zinc-400">{label}</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
            updateDropdownPosition();
          }}
          onFocus={() => {
            setIsOpen(true);
            updateDropdownPosition();
          }}
          onBlur={() => setIsOpen(false)}
          className={adminInputClassName}
          name={inputName}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-lpignore="true"
          data-1p-ignore="true"
          data-form-type="other"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          required={required}
        />
      </label>
      {isOpen && (visibleSuggestions.length > 0 || (canLoadGeoapifySuggestions && isLoadingSuggestions)) ? (
        <div
          id={listboxId}
          role="listbox"
          style={dropdownStyle}
          className="fixed z-[100] max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/40"
        >
          {canLoadGeoapifySuggestions && isLoadingSuggestions ? (
            <div className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Searching cities...
            </div>
          ) : null}
          {visibleSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              aria-selected={normalizePricingCity(value) === suggestion.normalized}
              onMouseDown={(event) => {
                event.preventDefault();
                onSuggestionSelect(suggestion);
                setIsOpen(false);
              }}
              className="flex min-h-11 w-full flex-col justify-center rounded-lg px-3 py-2 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              <span className="w-full truncate">{suggestion.displayName}</span>
              {suggestion.description ? (
                <span className="mt-0.5 w-full truncate text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {suggestion.description}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function routeToForm(route: SerializedOutstationRoute): RouteFormState {
  return {
    id: route.id,
    originCity: route.originCity,
    originState: route.originState ?? '',
    destinationCity: route.destinationCity,
    destinationState: route.destinationState ?? '',
    sedanFare: String(route.sedanFare),
    suvMarkup: String(route.suvMarkup),
    estimatedKm: route.estimatedKm === null ? '' : String(route.estimatedKm),
    isActive: route.isActive,
    isBidirectional: route.isBidirectional,
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
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState<RouteFormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const citySuggestions = useMemo(() => createCitySuggestionMap(routes), [routes]);
  const routeSearchIndex = useMemo(() => createRouteSearchIndex(routes), [routes]);
  const hasActiveTableFilters = Boolean(
    query.trim() ||
    fromFilter.trim() ||
    toFilter.trim() ||
    statusFilter !== 'all'
  );

  const filteredRoutes = useMemo(() => {
    return routeSearchIndex.filter((index) => {
      const { route } = index;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && route.isActive) ||
        (statusFilter === 'inactive' && !route.isActive);
      const matchesRouteFilters = routeMatchesDirectionalFilters(index, fromFilter, toFilter);
      const matchesQuery = routeMatchesGeneralSearch(index, query);

      return matchesStatus && matchesRouteFilters && matchesQuery;
    }).map((index) => index.route);
  }, [fromFilter, query, routeSearchIndex, statusFilter, toFilter]);

  const suggestedFare = calculateSuggestedFare(form.estimatedKm ? Number(form.estimatedKm) : null);

  function resetForm() {
    setForm(emptyForm);
    setError(null);
    setMessage(null);
  }

  function clearTableFilters() {
    setQuery('');
    setFromFilter('');
    setToFilter('');
    setStatusFilter('all');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const payload = {
      id: form.id || undefined,
      originCity: form.originCity,
      originState: form.originState || null,
      destinationCity: form.destinationCity,
      destinationState: form.destinationState || null,
      sedanFare: Number(form.sedanFare),
      suvMarkup: Number(form.suvMarkup),
      estimatedKm: form.estimatedKm ? Number(form.estimatedKm) : null,
      isActive: form.isActive,
      isBidirectional: form.isBidirectional,
      notes: form.notes || null,
    };

    try {
      const response = await fetch('/api/admin/outstation-routes', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
        credentials: 'include',
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
      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdminPanel className="flex min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-zinc-200 p-5 dark:border-zinc-800">
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-xl font-black text-zinc-950 dark:text-white">Outstation Pricing</h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Fixed customer fares for supported outstation one-way routes.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(150px,1fr)_minmax(150px,1fr)_minmax(170px,1fr)_140px_auto_auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    name="um-filter-rp-a-9d2f"
                    value={fromFilter}
                    onChange={(event) => setFromFilter(event.target.value)}
                    placeholder="From city"
                    className={cn(adminInputClassName, 'pl-9')}
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    name="um-filter-rp-b-4a7c"
                    value={toFilter}
                    onChange={(event) => setToFilter(event.target.value)}
                    placeholder="To city"
                    className={cn(adminInputClassName, 'pl-9')}
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                  />
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Keyword"
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
                <button
                  type="button"
                  onClick={clearTableFilters}
                  disabled={!hasActiveTableFilters}
                  className={adminSecondaryButtonClassName}
                >
                  Clear
                </button>
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
                  <th className="px-5 py-3">Suggested</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredRoutes.length === 0 && routes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-sm text-zinc-400 dark:text-zinc-500">
                      No outstation routes found. Add your first route.
                    </td>
                  </tr>
                ) : filteredRoutes.length === 0 && routes.length > 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-16 text-center text-sm text-zinc-400 dark:text-zinc-500">
                      No routes match your search or filter.
                    </td>
                  </tr>
                ) : null}
                {filteredRoutes.map((route) => (
                  <tr key={route.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-900/70">
                    <td className="px-5 py-4">
                      <div className="font-black text-zinc-950 dark:text-white">
                        {formatPricingCityTitle(route.originCity)} to {formatPricingCityTitle(route.destinationCity)}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {route.isBidirectional ? 'Matches both directions' : 'One-way only'}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{route.notes || 'No notes'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-zinc-950 dark:text-white">Eco {formatMoney(route.sedanFare)}</div>
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        XL {formatMoney(route.sedanFare + route.suvMarkup)}
                      </div>
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
              <CityAutocompleteInput
                label="Origin city"
                value={formatRouteCityInput(form.originCity, form.originState)}
                onChange={(value) => {
                  const location = parseRouteCityInput(value);
                  setForm({ ...form, originCity: location.city, originState: location.state });
                }}
                onSuggestionSelect={(suggestion) => setForm({
                  ...form,
                  originCity: suggestion.city,
                  originState: suggestion.state,
                })}
                suggestions={citySuggestions}
                required
              />
              <CityAutocompleteInput
                label="Destination city"
                value={formatRouteCityInput(form.destinationCity, form.destinationState)}
                onChange={(value) => {
                  const location = parseRouteCityInput(value);
                  setForm({ ...form, destinationCity: location.city, destinationState: location.state });
                }}
                onSuggestionSelect={(suggestion) => setForm({
                  ...form,
                  destinationCity: suggestion.city,
                  destinationState: suggestion.state,
                })}
                suggestions={citySuggestions}
                required
              />
            </div>

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

            <label className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-200">
              <input type="checkbox" checked={form.isBidirectional} onChange={(event) => setForm({ ...form, isBidirectional: event.target.checked })} />
              Match both directions
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
