'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, WheelEvent } from 'react';
import {
  Calculator,
  Car,
  Fuel,
  Loader2,
  MapPin,
  Navigation,
  Route,
  ShieldCheck,
  UserRound,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBookingLocationField } from '@/hooks/useBookingLocationField';
import type { BookingLocationMetadata } from '@/lib/bookingLocation';
import { cleanGeoapifyCityLocation } from '@/lib/locationFormatting';
import {
  calculateTripOverrideMilesXlPrice,
  createTripOverrideId,
  extractCityFromAddressOrText,
  formatTripOverrideMilesXlMarkup,
  formatTripOverrideCityName,
  getTripOverridePrice,
  getTripOverrideSedanPrice,
  matchTripOverride,
  normalizeCityName,
  sanitizeTripOverrideDraft,
  sanitizeTripOverrides,
  tripOverridesConflict,
  type TripOverride,
  type TripOverrideDraft,
} from '@/lib/tripOverrides';

type VehicleType = 'Sedan' | 'SUV';
type RouteType = 'One Way' | 'Round Trip' | 'Local';
type MarginMode = 'percentage' | 'flat';
type NumericInputValue = string;
type PricingFlashCard = 'toll-charges' | 'constant-cost' | 'trip-override';

type PricingInputs = {
  vehicleType: VehicleType;
  routeType: RouteType;
  nightCharge: boolean;
  fuelPricePerLiter: NumericInputValue;
  driverMonthlySalary: NumericInputValue;
  carEmiMonthly: NumericInputValue;
  maintenanceCostPerKm: NumericInputValue;
  taxiPermitAnnual: NumericInputValue;
  insuranceAnnual: NumericInputValue;
  tollCost: NumericInputValue;
  platformCharges: NumericInputValue;
  nightChargeAmount: NumericInputValue;
  marginMode: MarginMode;
  profitMargin: NumericInputValue;
  surgeMultiplier: NumericInputValue;
};
type ConstantCostInputs = Pick<
  PricingInputs,
  'fuelPricePerLiter' | 'maintenanceCostPerKm' | 'platformCharges' | 'profitMargin'
>;

type PricingResult = {
  fuelCost: number;
  maintenanceCost: number;
  driverCost: number;
  emiCost: number;
  permitCost: number;
  insuranceCost: number;
  tollCost: number;
  platformCharges: number;
  totalOperatingCost: number;
  routeAdjustment: number;
  nightAdjustment: number;
  finalProfitAmount: number;
  totalTripPrice: number;
};
type LocationFieldName = 'pickup' | 'dropoff';
type AddressSuggestion = {
  id: string;
  formatted: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  displayName: string;
  source: 'autocomplete' | 'manual';
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
type ManualPinSelection = {
  label: string;
  reverseLabel?: string;
  latitude: number;
  longitude: number;
};
type RouteEstimate = {
  distanceKm: number | null;
  durationMinutes: number | null;
  isLoading: boolean;
  error: string | null;
};
type ValidRouteEstimate = RouteEstimate & {
  distanceKm: number;
  durationMinutes: number;
};

const CONSTANT_COST_STORAGE_KEY = 'urbanmiles-pricing-engine-constant-costs';
const TRIP_OVERRIDE_STORAGE_KEY = 'urbanmiles-pricing-engine-trip-overrides';
const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? '';
const CITY_RESULT_TYPES = new Set(['city', 'county', 'state', 'postcode', 'district', 'suburb', 'locality']);
const DEFAULT_PIN_LOCATION = {
  latitude: 31.326,
  longitude: 75.5762,
  label: 'Jalandhar, Punjab',
};
const PIN_CITY_CENTERS: Record<string, { latitude: number; longitude: number; label: string }> = {
  jalandhar: { latitude: 31.326, longitude: 75.5762, label: 'Jalandhar, Punjab' },
  delhi: { latitude: 28.6139, longitude: 77.209, label: 'Delhi' },
  meerut: { latitude: 28.9845, longitude: 77.7064, label: 'Meerut, Uttar Pradesh' },
  chandigarh: { latitude: 30.7333, longitude: 76.7794, label: 'Chandigarh' },
  ludhiana: { latitude: 30.901, longitude: 75.8573, label: 'Ludhiana, Punjab' },
  amritsar: { latitude: 31.634, longitude: 74.8723, label: 'Amritsar, Punjab' },
};
const initialInputs: PricingInputs = {
  vehicleType: 'Sedan',
  routeType: 'One Way',
  nightCharge: false,
  fuelPricePerLiter: '',
  driverMonthlySalary: '28000',
  carEmiMonthly: '22000',
  maintenanceCostPerKm: '',
  taxiPermitAnnual: '25000',
  insuranceAnnual: '32000',
  tollCost: '250',
  platformCharges: '',
  nightChargeAmount: '0',
  marginMode: 'percentage',
  profitMargin: '18',
  surgeMultiplier: '1',
};
const initialConstantCosts: ConstantCostInputs = {
  fuelPricePerLiter: initialInputs.fuelPricePerLiter,
  maintenanceCostPerKm: initialInputs.maintenanceCostPerKm,
  platformCharges: initialInputs.platformCharges,
  profitMargin: initialInputs.profitMargin,
};
const initialTripOverrideDraft: TripOverrideDraft = {
  fromCity: '',
  toCity: '',
  fixedPrice: '',
  milesXlMarkupType: 'percentage',
  milesXlMarkupValue: '0',
  includeReverse: true,
  isActive: true,
};

const vehicleEfficiencyKmPerLiter: Record<VehicleType, number> = {
  Sedan: 16,
  SUV: 12,
};

const routeMultipliers: Record<RouteType, number> = {
  'One Way': 1,
  'Round Trip': 1.75,
  Local: 0.9,
};

const inputClassName =
  'h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-400';
const labelClassName = 'text-xs font-bold uppercase tracking-[0.14em] text-zinc-500';

export function PricingEngineClient() {
  const [inputs, setInputs] = useState<PricingInputs>(initialInputs);
  const pickupField = useBookingLocationField();
  const dropoffField = useBookingLocationField();
  const [activeLocationField, setActiveLocationField] = useState<LocationFieldName | null>(null);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);
  const [manualPinField, setManualPinField] = useState<LocationFieldName | null>(null);
  const [activeFlashCard, setActiveFlashCard] = useState<PricingFlashCard | null>(null);
  const [constantCosts, setConstantCosts] = useState<ConstantCostInputs>(initialConstantCosts);
  const [constantCostDraft, setConstantCostDraft] = useState<ConstantCostInputs>(initialConstantCosts);
  const [tripOverrides, setTripOverrides] = useState<TripOverride[]>([]);
  const [tripOverrideDraft, setTripOverrideDraft] = useState<TripOverrideDraft>(initialTripOverrideDraft);
  const [editingTripOverrideId, setEditingTripOverrideId] = useState<string | null>(null);
  const [tripOverrideError, setTripOverrideError] = useState('');
  const [isLocating, setIsLocating] = useState<Record<LocationFieldName, boolean>>({
    pickup: false,
    dropoff: false,
  });
  const [locationSuggestions, setLocationSuggestions] = useState<Record<LocationFieldName, AddressSuggestion[]>>({
    pickup: [],
    dropoff: [],
  });
  const [isLocationLoading, setIsLocationLoading] = useState<Record<LocationFieldName, boolean>>({
    pickup: false,
    dropoff: false,
  });
  const [routeEstimate, setRouteEstimate] = useState<RouteEstimate>({
    distanceKm: null,
    durationMinutes: null,
    isLoading: false,
    error: null,
  });
  const pricing = useMemo(
    () => (hasValidRouteEstimate(routeEstimate) ? calculatePricing(inputs, routeEstimate) : null),
    [inputs, routeEstimate]
  );
  const activeTripOverrideMatch = useMemo(
    () => matchTripOverride(tripOverrides, pickupField.address, dropoffField.address),
    [dropoffField.address, pickupField.address, tripOverrides]
  );
  const finalTripPrice = activeTripOverrideMatch
    ? getTripOverrideSedanPrice(activeTripOverrideMatch.override)
    : pricing?.totalTripPrice ?? null;
  const activeLocationValue =
    activeLocationField === 'pickup'
      ? pickupField.address
      : activeLocationField === 'dropoff'
        ? dropoffField.address
        : '';
  const activeSuggestions = activeLocationField ? locationSuggestions[activeLocationField] : [];

  function updateInput<Key extends keyof PricingInputs>(key: Key, value: PricingInputs[Key]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  function openConstantCostModal() {
    setConstantCostDraft(constantCosts);
    setActiveFlashCard('constant-cost');
  }

  function openTripOverrideModal() {
    setTripOverrideDraft(initialTripOverrideDraft);
    setEditingTripOverrideId(null);
    setTripOverrideError('');
    setActiveFlashCard('trip-override');
  }

  function closeFlashCard() {
    setActiveFlashCard(null);
    setTripOverrideError('');
    setEditingTripOverrideId(null);
  }

  function updateConstantCostDraft<Key extends keyof ConstantCostInputs>(
    key: Key,
    value: ConstantCostInputs[Key]
  ) {
    setConstantCostDraft((current) => ({ ...current, [key]: value }));
  }

  function saveConstantCosts() {
    const nextConstantCosts = sanitizeConstantCostInputs(constantCostDraft);
    setConstantCosts(nextConstantCosts);
    setInputs((current) => ({ ...current, ...nextConstantCosts }));
    window.localStorage.setItem(CONSTANT_COST_STORAGE_KEY, JSON.stringify(nextConstantCosts));
    closeFlashCard();
  }

  function startAddTripOverride() {
    setTripOverrideDraft(initialTripOverrideDraft);
    setEditingTripOverrideId(null);
    setTripOverrideError('');
  }

  function startEditTripOverride(override: TripOverride) {
    setTripOverrideDraft({
      fromCity: override.fromCity,
      toCity: override.toCity,
      fixedPrice: override.fixedPrice,
      milesXlMarkupType: override.milesXlMarkupType,
      milesXlMarkupValue: override.milesXlMarkupValue,
      includeReverse: override.includeReverse,
      isActive: override.isActive,
    });
    setEditingTripOverrideId(override.id);
    setTripOverrideError('');
  }

  function updateTripOverrideDraft<Key extends keyof TripOverrideDraft>(
    key: Key,
    value: TripOverrideDraft[Key]
  ) {
    setTripOverrideDraft((current) => ({ ...current, [key]: value }));
  }

  function cancelTripOverrideForm() {
    setTripOverrideDraft(initialTripOverrideDraft);
    setEditingTripOverrideId(null);
    setTripOverrideError('');
  }

  async function saveTripOverride() {
    const nextDraft = sanitizeTripOverrideDraft(tripOverrideDraft);
    const fixedPrice = getTripOverridePrice(nextDraft.fixedPrice);

    if (!normalizeCityName(nextDraft.fromCity) || !normalizeCityName(nextDraft.toCity) || fixedPrice <= 0) {
      setTripOverrideError('Enter from city, to city, and a Sedan Price above 0.');
      return;
    }

    if (normalizeCityName(nextDraft.fromCity) === normalizeCityName(nextDraft.toCity)) {
      setTripOverrideError('From City and To City must be different.');
      return;
    }

    const nextOverride: TripOverride = {
      id: editingTripOverrideId ?? createTripOverrideId(),
      ...nextDraft,
    };

    if (
      nextOverride.isActive &&
      tripOverrides.some(
        (override) =>
          override.id !== nextOverride.id &&
          override.isActive &&
          tripOverridesConflict(override, nextOverride)
      )
    ) {
      setTripOverrideError('An active override already exists for this city pair.');
      return;
    }

    const nextOverrides = editingTripOverrideId
      ? tripOverrides.map((override) => (override.id === editingTripOverrideId ? nextOverride : override))
      : [nextOverride, ...tripOverrides];

    try {
      const savedOverrides = await saveTripOverridesToServer(nextOverrides);
      setTripOverrides(savedOverrides);
      window.localStorage.removeItem(TRIP_OVERRIDE_STORAGE_KEY);
      cancelTripOverrideForm();
    } catch (error) {
      console.error('[Trip Override UI] save failed', error);
      setTripOverrideError('Could not save trip override. Please try again.');
    }
  }

  async function toggleTripOverrideActive(id: string) {
    const targetOverride = tripOverrides.find((override) => override.id === id);
    if (!targetOverride) {
      return;
    }

    const nextOverride = { ...targetOverride, isActive: !targetOverride.isActive };
    if (
      nextOverride.isActive &&
      tripOverrides.some(
        (override) =>
          override.id !== nextOverride.id &&
          override.isActive &&
          tripOverridesConflict(override, nextOverride)
      )
    ) {
      setTripOverrideError('An active override already exists for this city pair.');
      return;
    }

    const nextOverrides = tripOverrides.map((override) =>
      override.id === id ? nextOverride : override
    );

    try {
      const savedOverrides = await saveTripOverridesToServer(nextOverrides);
      setTripOverrideError('');
      setTripOverrides(savedOverrides);
      window.localStorage.removeItem(TRIP_OVERRIDE_STORAGE_KEY);
    } catch (error) {
      console.error('[Trip Override UI] update failed', error);
      setTripOverrideError('Could not update trip override. Please try again.');
    }
  }

  useEffect(() => {
    try {
      const storedConstantCosts = window.localStorage.getItem(CONSTANT_COST_STORAGE_KEY);

      if (!storedConstantCosts) {
        return;
      }

      const parsedConstantCosts = JSON.parse(storedConstantCosts) as Partial<ConstantCostInputs>;
      const nextConstantCosts = sanitizeConstantCostInputs({
        ...initialConstantCosts,
        ...parsedConstantCosts,
      });
      setConstantCosts(nextConstantCosts);
      setInputs((current) => ({ ...current, ...nextConstantCosts }));
      setConstantCostDraft(nextConstantCosts);
    } catch {
      setConstantCosts(initialConstantCosts);
      setConstantCostDraft(initialConstantCosts);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadTripOverrides() {
      try {
        let nextOverrides = await loadTripOverridesFromServer();
        const storedTripOverrides = readStoredTripOverrides();

        if (nextOverrides.length === 0 && storedTripOverrides.length > 0) {
          nextOverrides = await saveTripOverridesToServer(storedTripOverrides);
          window.localStorage.removeItem(TRIP_OVERRIDE_STORAGE_KEY);
        }

        if (!isCancelled) {
          setTripOverrides(nextOverrides);
        }
      } catch {
        if (!isCancelled) {
          setTripOverrides(readStoredTripOverrides());
        }
      }
    }

    loadTripOverrides();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeLocationField) {
      return;
    }

    const fieldName = activeLocationField;
    const query = activeLocationValue.trim();

    if (!hasMeaningfulLocationQuery(query)) {
      setLocationSuggestions((current) => ({ ...current, [fieldName]: [] }));
      setIsLocationLoading((current) => ({ ...current, [fieldName]: false }));
      return;
    }

    const controller = new AbortController();
    setIsLocationLoading((current) => ({ ...current, [fieldName]: true }));

    const timer = window.setTimeout(async () => {
      try {
        const suggestions = await fetchGeoapifyAddressSuggestions(query, controller.signal);
        setLocationSuggestions((current) => ({ ...current, [fieldName]: suggestions }));
      } catch {
        if (!controller.signal.aborted) {
          setLocationSuggestions((current) => ({ ...current, [fieldName]: [] }));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLocationLoading((current) => ({ ...current, [fieldName]: false }));
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeLocationField, activeLocationValue]);

  useEffect(() => {
    const pickupLatitude = pickupField.metadata.latitude;
    const pickupLongitude = pickupField.metadata.longitude;
    const dropoffLatitude = dropoffField.metadata.latitude;
    const dropoffLongitude = dropoffField.metadata.longitude;

    if (
      typeof pickupLatitude !== 'number' ||
      typeof pickupLongitude !== 'number' ||
      typeof dropoffLatitude !== 'number' ||
      typeof dropoffLongitude !== 'number'
    ) {
      setRouteEstimate({
        distanceKm: null,
        durationMinutes: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    const controller = new AbortController();
    setRouteEstimate({
      distanceKm: null,
      durationMinutes: null,
      isLoading: true,
      error: null,
    });

    void calculateRouteEstimate(
      {
        latitude: pickupLatitude,
        longitude: pickupLongitude,
      },
      {
        latitude: dropoffLatitude,
        longitude: dropoffLongitude,
      },
      controller.signal
    )
      .then((estimate) => {
        setRouteEstimate({
          ...estimate,
          isLoading: false,
          error: null,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRouteEstimate({
            distanceKm: null,
            durationMinutes: null,
            isLoading: false,
            error: 'Unable to calculate route. Please check pickup and drop-off locations.',
          });
        }
      });

    return () => controller.abort();
  }, [
    dropoffField.metadata.latitude,
    dropoffField.metadata.longitude,
    pickupField.metadata.latitude,
    pickupField.metadata.longitude,
  ]);

  function handleLocationInputChange(fieldName: LocationFieldName, value: string) {
    const field = fieldName === 'pickup' ? pickupField : dropoffField;
    field.updateAddress(value);
    setActiveLocationField(fieldName);
    setHighlightedSuggestionIndex(0);

    if (!hasMeaningfulLocationQuery(value)) {
      setLocationSuggestions((current) => ({ ...current, [fieldName]: [] }));
      setIsLocationLoading((current) => ({ ...current, [fieldName]: false }));
    }
  }

  function handleLocationSuggestionSelect(fieldName: LocationFieldName, suggestion: AddressSuggestion) {
    const field = fieldName === 'pickup' ? pickupField : dropoffField;
    const selectedLocation = suggestion.formatted || suggestion.displayName;

    field.setResolvedLocation(selectedLocation, {
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      placeId: suggestion.placeId,
      source: suggestion.source,
    });
    setActiveLocationField(null);
    setHighlightedSuggestionIndex(0);
    setLocationSuggestions((current) => ({ ...current, [fieldName]: [] }));
  }

  function handleManualPinConfirm(selection: ManualPinSelection) {
    if (!manualPinField) {
      return;
    }

    const label = getManualPinConfirmationLabel(selection);
    const field = manualPinField === 'pickup' ? pickupField : dropoffField;

    field.setResolvedLocation(label, {
      latitude: selection.latitude,
      longitude: selection.longitude,
      placeId: '',
      source: 'manual_pin',
    });
    setActiveLocationField(null);
    setManualPinField(null);
  }

  async function handleUseCurrentLocation(fieldName: LocationFieldName) {
    if (!navigator.geolocation) {
      return;
    }

    const field = fieldName === 'pickup' ? pickupField : dropoffField;
    setIsLocating((current) => ({ ...current, [fieldName]: true }));
    field.markCurrentLocationRequested();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        const reverseLabel = await reverseGeocodePinnedLocation(latitude, longitude);
        const label = reverseLabel || `Current location: ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;

        field.setResolvedLocation(label, {
          latitude,
          longitude,
          placeId: '',
          source: 'current-location',
        });
        setIsLocating((current) => ({ ...current, [fieldName]: false }));
      },
      () => setIsLocating((current) => ({ ...current, [fieldName]: false })),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <div className="pricing-engine-page dashboard-scrollbar flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pr-1">
      <header className="sticky top-0 z-40 -mx-1 flex shrink-0 flex-col gap-4 border-b border-zinc-200 bg-zinc-50 px-1 py-4 shadow-sm shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
            Pricing Engine
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-zinc-600 dark:text-zinc-400">
            Configure pricing logic, operational costs, tolls, and fare calculations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <PricingHeaderButton onClick={() => setActiveFlashCard('toll-charges')}>
            Toll Charges
          </PricingHeaderButton>
          <PricingHeaderButton onClick={openConstantCostModal}>
            Constant Cost
          </PricingHeaderButton>
          <PricingHeaderButton onClick={openTripOverrideModal}>
            Trip Override
          </PricingHeaderButton>
        </div>
      </header>
      {activeFlashCard ? (
        <PricingFlashCardModal
          title={getPricingFlashCardTitle(activeFlashCard)}
          onClose={closeFlashCard}
          size={activeFlashCard === 'trip-override' ? 'wide' : 'default'}
          footer={
            activeFlashCard === 'constant-cost' ? (
              <div className="flex flex-col-reverse gap-2 border-t border-zinc-800 px-5 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeFlashCard}
                  className="min-h-10 rounded-xl border border-zinc-800 px-4 text-sm font-black text-zinc-100 transition-colors hover:border-zinc-700 hover:bg-zinc-900 focus:border-amber-400 focus:outline-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveConstantCosts}
                  className="min-h-10 rounded-xl bg-amber-400 px-4 text-sm font-black text-zinc-950 transition-colors hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-zinc-950"
                >
                  Save Changes
                </button>
              </div>
            ) : null
          }
        >
          {activeFlashCard === 'constant-cost' ? (
            <div className="grid gap-4">
              <NumberField
                label="Fuel Price"
                value={constantCostDraft.fuelPricePerLiter}
                prefix="₹"
                suffix="/ liter"
                onChange={(value) => updateConstantCostDraft('fuelPricePerLiter', value)}
              />
              <NumberField
                label="Maintenance Cost Per KM"
                value={constantCostDraft.maintenanceCostPerKm}
                prefix="₹"
                suffix="/ km"
                onChange={(value) => updateConstantCostDraft('maintenanceCostPerKm', value)}
              />
              <NumberField
                label="Platform Charges"
                value={constantCostDraft.platformCharges}
                prefix="₹"
                suffix="/ trip"
                onChange={(value) => updateConstantCostDraft('platformCharges', value)}
              />
              <NumberField
                label="Profit Margin"
                value={constantCostDraft.profitMargin}
                suffix="%"
                onChange={(value) => updateConstantCostDraft('profitMargin', value)}
              />
            </div>
          ) : null}
          {activeFlashCard === 'trip-override' ? (
            <TripOverrideModalContent
              overrides={tripOverrides}
              draft={tripOverrideDraft}
              editingId={editingTripOverrideId}
              error={tripOverrideError}
              onAdd={startAddTripOverride}
              onEdit={startEditTripOverride}
              onToggleActive={toggleTripOverrideActive}
              onDraftChange={updateTripOverrideDraft}
              onSave={saveTripOverride}
              onCancel={cancelTripOverrideForm}
            />
          ) : null}
        </PricingFlashCardModal>
      ) : null}

      <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
        <div className="space-y-5">
          <PricingCard title="Trip Details">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Vehicle Type"
                value={inputs.vehicleType}
                options={['Sedan', 'SUV']}
                onChange={(value) => updateInput('vehicleType', value as VehicleType)}
              />
              <SelectField
                label="Route Type"
                value={inputs.routeType}
                options={['One Way', 'Round Trip', 'Local']}
                onChange={(value) => updateInput('routeType', value as RouteType)}
              />
              <PricingLocationField
                label="Pickup Location"
                name="pricing-pickup-location"
                value={pickupField.address}
                placeholder="Enter pickup location"
                suggestions={activeLocationField === 'pickup' ? activeSuggestions : []}
                highlightedSuggestionIndex={highlightedSuggestionIndex}
                isLoadingSuggestions={activeLocationField === 'pickup' && isLocationLoading.pickup}
                isLocating={isLocating.pickup}
                showPickOnMapOption={
                  activeLocationField === 'pickup' &&
                  shouldShowPickOnMapOption(pickupField.address, locationSuggestions.pickup)
                }
                onChange={(value) => handleLocationInputChange('pickup', value)}
                onFocus={() => {
                  setActiveLocationField('pickup');
                  setHighlightedSuggestionIndex(0);
                }}
                onBlur={() => window.setTimeout(() => setActiveLocationField(null), 120)}
                onSuggestionSelect={(suggestion) => handleLocationSuggestionSelect('pickup', suggestion)}
                onPickOnMap={() => setManualPinField('pickup')}
                onUseCurrentLocation={() => handleUseCurrentLocation('pickup')}
              />
              <PricingLocationField
                label="Drop-off Location"
                name="pricing-dropoff-location"
                value={dropoffField.address}
                placeholder="Enter drop-off location"
                suggestions={activeLocationField === 'dropoff' ? activeSuggestions : []}
                highlightedSuggestionIndex={highlightedSuggestionIndex}
                isLoadingSuggestions={activeLocationField === 'dropoff' && isLocationLoading.dropoff}
                isLocating={isLocating.dropoff}
                showPickOnMapOption={
                  activeLocationField === 'dropoff' &&
                  shouldShowPickOnMapOption(dropoffField.address, locationSuggestions.dropoff)
                }
                onChange={(value) => handleLocationInputChange('dropoff', value)}
                onFocus={() => {
                  setActiveLocationField('dropoff');
                  setHighlightedSuggestionIndex(0);
                }}
                onBlur={() => window.setTimeout(() => setActiveLocationField(null), 120)}
                onSuggestionSelect={(suggestion) => handleLocationSuggestionSelect('dropoff', suggestion)}
                onPickOnMap={() => setManualPinField('dropoff')}
                onUseCurrentLocation={() => handleUseCurrentLocation('dropoff')}
              />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <RouteEstimatePill
                label="Estimated Distance"
                value={routeEstimate.isLoading ? 'Calculating...' : formatRouteDistance(routeEstimate)}
              />
              <RouteEstimatePill
                label="Estimated Duration"
                value={routeEstimate.isLoading ? 'Calculating...' : formatRouteDuration(routeEstimate)}
              />
            </div>
            {routeEstimate.error ? (
              <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
                {routeEstimate.error}
              </div>
            ) : null}
          </PricingCard>
          {manualPinField ? (
            <ManualPinMapModal
              fieldLabel={manualPinField === 'pickup' ? 'pickup' : 'drop-off'}
              initialLocation={getManualPinInitialLocation(
                manualPinField === 'pickup' ? pickupField.address : dropoffField.address,
                locationSuggestions[manualPinField],
                manualPinField === 'pickup' ? pickupField.metadata : dropoffField.metadata
              )}
              onCancel={() => setManualPinField(null)}
              onConfirm={handleManualPinConfirm}
            />
          ) : null}

          <PricingCard title="Cost & Assumptions">
            <div className="grid gap-4 md:grid-cols-2">
              <NumberField
                label="Driver Monthly Salary"
                value={inputs.driverMonthlySalary}
                prefix="₹"
                onChange={(value) => updateInput('driverMonthlySalary', value)}
              />
              <NumberField
                label="Car EMI (Monthly)"
                value={inputs.carEmiMonthly}
                prefix="₹"
                onChange={(value) => updateInput('carEmiMonthly', value)}
              />
              <NumberField
                label="Taxi Permit (Annual)"
                value={inputs.taxiPermitAnnual}
                prefix="₹"
                onChange={(value) => updateInput('taxiPermitAnnual', value)}
              />
              <NumberField
                label="Insurance (Annual)"
                value={inputs.insuranceAnnual}
                prefix="₹"
                onChange={(value) => updateInput('insuranceAnnual', value)}
              />
              <NumberField
                label="Toll Cost"
                value={inputs.tollCost}
                prefix="₹"
                suffix="/ trip"
                onChange={(value) => updateInput('tollCost', value)}
              />
              <NightChargeField
                amount={inputs.nightChargeAmount}
                enabled={inputs.nightCharge}
                onAmountChange={(value) => updateInput('nightChargeAmount', value)}
                onEnabledChange={(value) => updateInput('nightCharge', value)}
              />
            </div>

            <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
              <p className="text-sm font-bold leading-6 text-amber-100">
                All operational costs are converted into trip-based pricing using route distance and fixed operational assumptions.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm font-medium text-zinc-300">
                <li>Distance-based maintenance calculation</li>
                <li>Monthly and annual operational allocation</li>
                <li>Route and toll based pricing adjustments</li>
              </ul>
            </div>
          </PricingCard>
        </div>

        <div className="space-y-5">
          <PricingCard title="Cost Breakdown (Per Trip)">
            <div className="space-y-2">
              <PricingRow icon={Fuel} label="Fuel Cost" amount={pricing?.fuelCost} />
              <PricingRow icon={Wrench} label="Maintenance Cost" amount={pricing?.maintenanceCost} />
              <PricingRow icon={UserRound} label="Driver Cost" amount={pricing?.driverCost} />
              <PricingRow icon={Car} label="EMI Cost" amount={pricing?.emiCost} />
              <PricingRow icon={Route} label="Permit Cost" amount={pricing?.permitCost} />
              <PricingRow icon={ShieldCheck} label="Insurance Cost" amount={pricing?.insuranceCost} />
              <PricingRow icon={Wallet} label="Toll Cost" amount={pricing?.tollCost} />
              {inputs.nightCharge ? (
                <PricingRow icon={Wallet} label="Night Charge" amount={pricing?.nightAdjustment} />
              ) : null}
              <PricingRow icon={Calculator} label="Platform Charges" amount={pricing?.platformCharges} />
            </div>
            <div className="my-4 h-px bg-zinc-800" />
            <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-400 bg-zinc-950 px-4 py-3">
              <span className="text-sm font-black text-zinc-100">Total Operating Cost (Per Trip)</span>
              <span className="text-xl font-black text-amber-300">
                {pricing ? formatInr(pricing.totalOperatingCost) : '—'}
              </span>
            </div>
          </PricingCard>

          <PricingCard title="Profit Margin">
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
              <MarginModeButton
                active={inputs.marginMode === 'percentage'}
                onClick={() => updateInput('marginMode', 'percentage')}
              >
                Percentage (%)
              </MarginModeButton>
              <MarginModeButton
                active={inputs.marginMode === 'flat'}
                onClick={() => updateInput('marginMode', 'flat')}
              >
                Flat Amount (₹)
              </MarginModeButton>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <NumberField
                label="Profit Margin"
                value={inputs.profitMargin}
                prefix={inputs.marginMode === 'flat' ? '₹' : undefined}
                suffix={inputs.marginMode === 'percentage' ? '%' : undefined}
                onChange={(value) => updateInput('profitMargin', value)}
              />
              <NumberField
                label="Surge Multiplier"
                value={inputs.surgeMultiplier}
                suffix="x"
                onChange={(value) => updateInput('surgeMultiplier', value)}
              />
              <ReadOnlyAmount label="Final Profit Amount" value={pricing?.finalProfitAmount} />
            </div>
          </PricingCard>

          <section className="rounded-xl border border-amber-400 bg-zinc-950 p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
              Total Trip Price
            </p>
            <div
              className={cn(
                'mt-3 font-black tracking-tight text-amber-300',
                typeof finalTripPrice === 'number' ? 'text-5xl sm:text-6xl' : 'text-2xl sm:text-3xl'
              )}
            >
              {typeof finalTripPrice === 'number' ? formatInr(finalTripPrice) : 'Select route to calculate price'}
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-400">
              {activeTripOverrideMatch
                ? `Sedan override price for ${activeTripOverrideMatch.override.fromCity} ${
                    activeTripOverrideMatch.override.includeReverse ? '<->' : '->'
                  } ${activeTripOverrideMatch.override.toCity}`
                : 'Operating cost + margin + route adjustments'}
            </p>
            {activeTripOverrideMatch ? (
              <div className="mt-4 inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-amber-300">
                Trip Override Applied
              </div>
            ) : null}
          </section>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs font-semibold leading-5 text-zinc-400">
            Prices are estimated and may vary depending on traffic, tolls, waiting time, and live operational conditions.
          </div>
        </div>
      </div>
    </div>
  );
}

function calculatePricing(inputs: PricingInputs, routeEstimate: ValidRouteEstimate): PricingResult {
  const distanceKm = Math.max(0, safeNumber(routeEstimate.distanceKm));
  const fuelPricePerLiter = Math.max(0, safeNumber(inputs.fuelPricePerLiter));
  const driverMonthlySalary = Math.max(0, safeNumber(inputs.driverMonthlySalary));
  const carEmiMonthly = Math.max(0, safeNumber(inputs.carEmiMonthly));
  const maintenanceCostPerKm = Math.max(0, safeNumber(inputs.maintenanceCostPerKm));
  const taxiPermitAnnual = Math.max(0, safeNumber(inputs.taxiPermitAnnual));
  const insuranceAnnual = Math.max(0, safeNumber(inputs.insuranceAnnual));
  const tollCost = Math.max(0, safeNumber(inputs.tollCost));
  const inputPlatformCharges = inputs.platformCharges;
  const platformCharges = Math.max(0, safeNumber(inputPlatformCharges));
  const nightAdjustment = inputs.nightCharge ? Math.max(0, safeNumber(inputs.nightChargeAmount)) : 0;
  const profitMargin = Math.max(0, safeNumber(inputs.profitMargin));
  const surgeMultiplier = Math.max(0, safeNumber(inputs.surgeMultiplier));
  const fuelEfficiency = Math.max(1, safeNumber(vehicleEfficiencyKmPerLiter[inputs.vehicleType]));
  const routeMultiplier = Math.max(0, safeNumber(routeMultipliers[inputs.routeType], 1));

  const fuelCost = (distanceKm / fuelEfficiency) * fuelPricePerLiter;
  const maintenanceCost = distanceKm * maintenanceCostPerKm;
  const driverCost = driverMonthlySalary / 30;
  const emiCost = carEmiMonthly / 30;
  const permitCost = taxiPermitAnnual / 365;
  const insuranceCost = insuranceAnnual / 365;
  const baseSubtotal = fuelCost + maintenanceCost + driverCost + emiCost + permitCost + insuranceCost + tollCost;
  const operatingCostWithPlatformCharges = baseSubtotal + platformCharges;
  const totalOperatingCost = operatingCostWithPlatformCharges + nightAdjustment;
  const routeAdjustedOperatingCost = operatingCostWithPlatformCharges * routeMultiplier;
  const routeAdjustment = routeAdjustedOperatingCost - operatingCostWithPlatformCharges;
  const rawProfit =
    inputs.marginMode === 'percentage'
      ? routeAdjustedOperatingCost * (profitMargin / 100)
      : profitMargin;
  const finalProfitAmount = rawProfit * surgeMultiplier;

  return {
    fuelCost,
    maintenanceCost,
    driverCost,
    emiCost,
    permitCost,
    insuranceCost,
    tollCost,
    platformCharges,
    totalOperatingCost,
    routeAdjustment,
    nightAdjustment,
    finalProfitAmount,
    totalTripPrice: routeAdjustedOperatingCost + finalProfitAmount + nightAdjustment,
  };
}

function PricingCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <h2 className="text-base font-black text-zinc-100">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function PricingHeaderButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm font-black text-zinc-100 transition-colors hover:border-amber-400 hover:text-amber-300 focus:border-amber-400 focus:outline-none"
    >
      {children}
    </button>
  );
}

function getPricingFlashCardTitle(card: PricingFlashCard) {
  if (card === 'toll-charges') {
    return 'Toll Charges';
  }

  if (card === 'trip-override') {
    return 'Trip Override';
  }

  return 'Constant Cost';
}

function PricingFlashCardModal({
  title,
  onClose,
  children,
  footer,
  size = 'default',
}: {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'default' | 'wide';
}) {
  const isWide = size === 'wide';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/70 px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close pricing card"
        onClick={onClose}
      />
      <section
        className={cn(
          'relative z-10 flex w-full flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40',
          isWide
            ? 'h-[min(80vh,780px)] max-h-[80vh] max-w-[1100px]'
            : 'max-h-[min(90vh,760px)] min-h-64 max-w-xl'
        )}
      >
        <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <h2 className="text-base font-black text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 text-zinc-300 transition-colors hover:border-amber-400 hover:text-amber-300 focus:border-amber-400 focus:outline-none"
            aria-label={`Close ${title}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div
          className={cn(
            'min-h-0 flex-1',
            isWide ? 'overflow-hidden p-0' : 'dashboard-scrollbar min-h-48 overflow-y-auto p-5'
          )}
        >
          {children}
        </div>
        {footer}
      </section>
    </div>
  );
}

function TripOverrideModalContent({
  overrides,
  draft,
  editingId,
  error,
  onAdd,
  onEdit,
  onToggleActive,
  onDraftChange,
  onSave,
  onCancel,
}: {
  overrides: TripOverride[];
  draft: TripOverrideDraft;
  editingId: string | null;
  error: string;
  onAdd: () => void;
  onEdit: (override: TripOverride) => void;
  onToggleActive: (id: string) => void;
  onDraftChange: <Key extends keyof TripOverrideDraft>(key: Key, value: TripOverrideDraft[Key]) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');
  const filteredOverrides = useMemo(
    () =>
      overrides.filter((override) =>
        overrideMatchesUniversalRouteFilter(override, fromFilter) &&
        overrideMatchesUniversalRouteFilter(override, toFilter)
      ),
    [fromFilter, overrides, toFilter]
  );

  return (
    <div className="dashboard-scrollbar grid h-full min-h-0 overflow-y-auto lg:grid-cols-[45fr_55fr] lg:overflow-hidden">
      <section className="flex min-h-[340px] flex-col border-b border-zinc-800 bg-zinc-950 lg:min-h-0 lg:border-b-0 lg:border-r">
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-950 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-zinc-100">Saved Overrides</h3>
              <p className="mt-1 text-sm font-semibold text-zinc-500">Fixed route pricing rules</p>
            </div>
            <button
              type="button"
              onClick={onAdd}
              className="min-h-9 shrink-0 rounded-xl border border-zinc-800 px-3 text-sm font-black text-zinc-100 transition-colors hover:border-amber-400 hover:text-amber-300 focus:border-amber-400 focus:outline-none"
            >
              New
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <TripOverrideSearchField
              label="From City search"
              value={fromFilter}
              onChange={setFromFilter}
            />
            <TripOverrideSearchField
              label="To City search"
              value={toFilter}
              onChange={setToFilter}
            />
          </div>
        </div>

        <div className="dashboard-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {filteredOverrides.length > 0 ? (
            filteredOverrides.map((override) => {
              const isEditing = override.id === editingId;

              return (
                <div
                  key={override.id}
                  className={cn(
                    'rounded-xl border bg-zinc-900 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900/80',
                    isEditing ? 'border-amber-400/60' : 'border-zinc-800'
                  )}
                >
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                    <div className="min-w-0">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <OverrideDetail label="From City" value={override.fromCity} />
                        <OverrideDetail label="To City" value={override.toCity} />
                        <OverrideDetail label="Sedan Price" value={formatInr(safeNumber(override.fixedPrice))} />
                        <OverrideDetail label="Miles XL Markup" value={formatTripOverrideMilesXlMarkup(override)} />
                        <OverrideDetail label="Miles XL Price" value={formatInr(calculateTripOverrideMilesXlPrice(override))} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <SwitchStatusPill label="Reverse Route" checked={override.includeReverse} />
                        <SwitchStatusPill
                          label="Active"
                          checked={override.isActive}
                          onClick={() => onToggleActive(override.id)}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(override)}
                      className={cn(
                        'min-h-9 rounded-xl border px-3 text-sm font-black transition-colors focus:border-amber-400 focus:outline-none',
                        isEditing
                          ? 'border-amber-400/60 text-amber-300'
                          : 'border-zinc-800 text-zinc-100 hover:border-amber-400 hover:text-amber-300'
                      )}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 px-4 py-10 text-center text-sm font-bold text-zinc-500">
              No overrides match this search.
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-scrollbar min-h-[420px] overflow-y-auto bg-zinc-950 p-5 lg:min-h-0">
        <div className="mx-auto max-w-xl">
          <div className="mb-6">
            <h3 className="text-xl font-black text-zinc-100">
              {editingId ? 'Edit Route Override' : 'Add Route Override'}
            </h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-zinc-500">
              Configure a Sedan city-to-city price with a future Miles XL markup. Street addresses are reduced to clean city names when saved.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TripOverrideCityField
                  label="From City"
                  value={draft.fromCity}
                  onChange={(value) => onDraftChange('fromCity', value)}
                  placeholder="Type city"
                />
                <TripOverrideCityField
                  label="To City"
                  value={draft.toCity}
                  onChange={(value) => onDraftChange('toCity', value)}
                  placeholder="Type city"
                />
              </div>
              <NumberField
                label="Sedan Price"
                value={draft.fixedPrice}
                prefix="₹"
                onChange={(value) => onDraftChange('fixedPrice', value)}
              />
              <NumberField
                label="Miles XL Markup"
                value={draft.milesXlMarkupValue}
                prefix={draft.milesXlMarkupType === 'flat' ? '₹' : undefined}
                suffix={draft.milesXlMarkupType === 'percentage' ? '%' : undefined}
                onChange={(value) => onDraftChange('milesXlMarkupValue', value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <MarkupTypeButton
                  active={draft.milesXlMarkupType === 'percentage'}
                  onClick={() => onDraftChange('milesXlMarkupType', 'percentage')}
                >
                  Percentage (%)
                </MarkupTypeButton>
                <MarkupTypeButton
                  active={draft.milesXlMarkupType === 'flat'}
                  onClick={() => onDraftChange('milesXlMarkupType', 'flat')}
                >
                  Flat Amount (₹)
                </MarkupTypeButton>
              </div>
              <div className="grid gap-3">
                <ToggleSwitchField
                  label="Reverse Route"
                  checked={draft.includeReverse}
                  onChange={(checked) => onDraftChange('includeReverse', checked)}
                />
                <ToggleSwitchField
                  label="Active"
                  checked={draft.isActive}
                  onChange={(checked) => onDraftChange('isActive', checked)}
                />
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                {error}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="min-h-10 rounded-xl border border-zinc-800 px-4 text-sm font-black text-zinc-100 transition-colors hover:border-zinc-700 hover:bg-zinc-950 focus:border-amber-400 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSave}
                className="min-h-10 rounded-xl bg-amber-400 px-5 text-sm font-black text-zinc-950 transition-colors hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2 focus:ring-offset-zinc-900"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function OverrideDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-zinc-100">{value}</p>
    </div>
  );
}

function TripOverrideSearchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClassName}>{label}</span>
      <input
        type="search"
        value={value}
        placeholder="Type city"
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        className={cn(inputClassName, 'mt-2')}
      />
    </label>
  );
}

function TripOverrideCityField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const query = value.trim();

  useEffect(() => {
    if (!isFocused || !GEOAPIFY_API_KEY || !hasMeaningfulLocationQuery(query)) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const nextSuggestions = await fetchGeoapifyAddressSuggestions(query, controller.signal);
        setSuggestions(nextSuggestions);
      } catch (error) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isFocused, query]);

  function commitCityInput(input: string) {
    const cityName = formatTripOverrideCityName(input);
    onChange(cityName || input.trim());
  }

  function selectSuggestion(suggestion: AddressSuggestion) {
    commitCityInput(getTripOverrideCitySuggestionText(suggestion));
    setSuggestions([]);
    setIsFocused(false);
  }

  const showDropdown = isFocused && (isLoading || suggestions.length > 0);

  return (
    <label className="relative block">
      <span className={labelClassName}>{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          window.setTimeout(() => {
            setIsFocused(false);
            commitCityInput(value);
          }, 120);
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        className={cn(inputClassName, 'mt-2')}
      />
      {showDropdown ? (
        <div className="absolute left-0 right-0 top-full z-[120] mt-2 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm font-bold text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Searching locations...
            </div>
          ) : null}
          {suggestions.map((suggestion) => {
            const cityName = formatTripOverrideCityName(getTripOverrideCitySuggestionText(suggestion));

            return (
              <button
                key={suggestion.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-zinc-900 focus:bg-zinc-900 focus:outline-none"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-zinc-100">
                    {cityName || suggestion.city || suggestion.displayName}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-zinc-500">
                    {suggestion.displayName}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </label>
  );
}

function getTripOverrideCitySuggestionText(suggestion: AddressSuggestion) {
  const componentText = [
    suggestion.city,
    suggestion.addressLine1,
    suggestion.addressLine2,
    suggestion.state,
  ]
    .filter(Boolean)
    .join(', ');

  if (extractCityFromAddressOrText(componentText)) {
    return componentText;
  }

  return [suggestion.formatted, suggestion.displayName, componentText].filter(Boolean).join(', ');
}

function ToggleSwitchField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex min-h-10 items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-left transition-colors hover:border-zinc-700 focus:border-amber-400 focus:outline-none"
      aria-pressed={checked}
    >
      <span className="text-sm font-bold text-zinc-200">{label}</span>
      <SwitchTrack checked={checked} size="md" />
    </button>
  );
}

function MarkupTypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-10 rounded-xl border px-4 text-sm font-black transition-colors focus:border-amber-400 focus:outline-none',
        active
          ? 'border-amber-400 bg-amber-400 text-zinc-950 hover:bg-amber-300'
          : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
      )}
    >
      {children}
    </button>
  );
}

function SwitchStatusPill({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick?: () => void;
}) {
  const isInteractive = Boolean(onClick);
  const Component = isInteractive ? 'button' : 'span';

  return (
    <Component
      type={isInteractive ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={isInteractive ? checked : undefined}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-black text-zinc-200 transition-colors',
        isInteractive
          ? 'hover:border-zinc-600 hover:bg-zinc-900 focus:border-amber-400 focus:outline-none'
          : 'cursor-default'
      )}
    >
      <span>{label}</span>
      <SwitchTrack checked={checked} size="sm" />
    </Component>
  );
}

function SwitchTrack({ checked, size }: { checked: boolean; size: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-out',
        size === 'md' ? 'h-6 w-11' : 'h-4 w-8',
        checked ? 'bg-amber-400' : 'bg-zinc-700'
      )}
      aria-hidden="true"
    >
      <span
        className={cn(
          'absolute rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
          size === 'md' ? 'left-0.5 top-0.5 h-5 w-5' : 'left-0.5 top-0.5 h-3 w-3',
          checked && (size === 'md' ? 'translate-x-5' : 'translate-x-4')
        )}
      />
    </span>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClassName}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(inputClassName, 'mt-2 appearance-none')}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function PricingLocationField({
  label,
  name,
  value,
  placeholder,
  suggestions,
  highlightedSuggestionIndex,
  isLoadingSuggestions,
  isLocating,
  showPickOnMapOption,
  onChange,
  onFocus,
  onBlur,
  onSuggestionSelect,
  onPickOnMap,
  onUseCurrentLocation,
}: {
  label: string;
  name: string;
  value: string;
  placeholder: string;
  suggestions: AddressSuggestion[];
  highlightedSuggestionIndex: number;
  isLoadingSuggestions: boolean;
  isLocating: boolean;
  showPickOnMapOption: boolean;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSuggestionSelect: (suggestion: AddressSuggestion) => void;
  onPickOnMap: () => void;
  onUseCurrentLocation: () => void;
}) {
  const listboxId = `${name}-suggestions`;
  const canPickOnMap = showPickOnMapOption;
  const hasTypedQuery = hasMeaningfulLocationQuery(value);
  const showDropdown = suggestions.length > 0 || isLoadingSuggestions || canPickOnMap;

  return (
    <div className="relative">
      <label className="block">
        <span className={labelClassName}>{label}</span>
        <div className="relative mt-2">
          <input
            type="text"
            name={name}
            value={value}
            placeholder={placeholder}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            aria-autocomplete={showDropdown ? 'list' : undefined}
            aria-controls={showDropdown ? listboxId : undefined}
            onChange={(event) => onChange(event.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            className={cn(inputClassName, 'pr-10')}
          />
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onUseCurrentLocation}
            disabled={isLocating}
            title="Use current location"
            aria-label="Use current location"
            className={cn(
              'absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 transition-colors hover:text-zinc-100',
              isLocating && 'pointer-events-none opacity-50'
            )}
          >
            {isLocating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Navigation className="h-4 w-4 rotate-[-45deg]" aria-hidden="true" />
            )}
          </button>
        </div>
      </label>

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          className="dashboard-scrollbar absolute left-0 right-0 top-[calc(100%+8px)] z-[80] max-h-[min(16rem,52vh)] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-xl shadow-black/30"
        >
          {canPickOnMap ? (
            <button
              type="button"
              role="option"
              aria-selected={false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={onPickOnMap}
              className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-left text-sm font-black text-zinc-100 transition-colors hover:border-amber-300/40 hover:bg-amber-400/15 focus:bg-amber-400/15 focus:outline-none"
            >
              <MapPin className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate">Pick on map</span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-amber-200">
                  Best for streets, villages, colonies, or exact pickup points
                </span>
              </span>
            </button>
          ) : null}
          {isLoadingSuggestions ? (
            <div className="mt-1 flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Searching addresses...
            </div>
          ) : null}
          {!isLoadingSuggestions && suggestions.length === 0 && hasTypedQuery && !canPickOnMap ? (
            <div className="min-h-10 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-400">
              No addresses found
            </div>
          ) : null}
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              aria-selected={index === highlightedSuggestionIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSuggestionSelect(suggestion)}
              className={cn(
                'flex min-h-12 w-full flex-col justify-center rounded-xl px-3 py-2 text-left text-sm font-semibold text-zinc-100 transition-colors hover:bg-zinc-900 focus:bg-zinc-900 focus:outline-none',
                index === highlightedSuggestionIndex && 'bg-zinc-900'
              )}
            >
              <span className="w-full truncate">{suggestion.addressLine1 || suggestion.formatted}</span>
              {suggestion.addressLine2 ? (
                <span className="mt-0.5 w-full truncate text-xs font-medium text-zinc-400">
                  {suggestion.addressLine2}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RouteEstimatePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className="mt-1 text-base font-black text-amber-300">{value}</p>
    </div>
  );
}

function formatRouteDistance(routeEstimate: RouteEstimate) {
  if (!hasValidRouteEstimate(routeEstimate)) {
    return '—';
  }

  return `${formatCompactNumber(routeEstimate.distanceKm)} km`;
}

function formatRouteDuration(routeEstimate: RouteEstimate) {
  if (!hasValidRouteEstimate(routeEstimate)) {
    return '—';
  }

  return `${formatCompactNumber(routeEstimate.durationMinutes)} min`;
}

function ManualPinMapModal({
  fieldLabel,
  initialLocation,
  onCancel,
  onConfirm,
}: {
  fieldLabel: 'pickup' | 'drop-off';
  initialLocation: ManualPinSelection;
  onCancel: () => void;
  onConfirm: (selection: ManualPinSelection) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [latitude, setLatitude] = useState(initialLocation.latitude);
  const [longitude, setLongitude] = useState(initialLocation.longitude);
  const [label, setLabel] = useState('');
  const [reverseLabel, setReverseLabel] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let map: import('maplibre-gl').Map | null = null;
    let marker: import('maplibre-gl').Marker | null = null;

    const initMap = async () => {
      const maplibregl = await import('maplibre-gl');

      if (!isMounted || !mapContainerRef.current) {
        return;
      }

      const center: [number, number] = [initialLocation.longitude, initialLocation.latitude];

      map = new maplibregl.Map({
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
        zoom: 14,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

      const markerElement = document.createElement('div');
      markerElement.className = 'h-7 w-7 rounded-full border-4 border-white bg-amber-500 shadow-xl shadow-zinc-950/30 ring-2 ring-zinc-950/10';

      marker = new maplibregl.Marker({ element: markerElement, draggable: true })
        .setLngLat(center)
        .addTo(map);

      const updateFromMarker = () => {
        if (!marker) {
          return;
        }

        const next = marker.getLngLat();
        setLatitude(Number(next.lat.toFixed(6)));
        setLongitude(Number(next.lng.toFixed(6)));
      };

      marker.on('dragend', updateFromMarker);
      map.on('click', (event) => {
        marker?.setLngLat(event.lngLat);
        updateFromMarker();
      });
      map.once('load', () => map?.resize());
    };

    void initMap();

    return () => {
      isMounted = false;
      map?.remove();
    };
  }, [initialLocation.latitude, initialLocation.longitude]);

  useEffect(() => {
    let isMounted = true;
    setReverseLabel('');

    const timer = window.setTimeout(async () => {
      try {
        const resolvedReverseLabel = await reverseGeocodePinnedLocation(latitude, longitude);
        if (isMounted) {
          setReverseLabel(resolvedReverseLabel || '');
        }
      } catch {
        if (isMounted) {
          setReverseLabel('');
        }
      }
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [latitude, longitude]);

  const handleConfirm = async () => {
    const noteLabel = label.trim();
    let nextReverseLabel = reverseLabel.trim();

    if (!noteLabel && !nextReverseLabel) {
      setIsConfirming(true);
      try {
        nextReverseLabel = (await reverseGeocodePinnedLocation(latitude, longitude))?.trim() || '';
        setReverseLabel(nextReverseLabel);
      } catch {
        nextReverseLabel = '';
      }
    }

    onConfirm({
      label: noteLabel,
      reverseLabel: nextReverseLabel,
      latitude,
      longitude,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/70 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/40 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-4 py-4 sm:px-5">
          <div>
            <h3 className="text-xl font-black text-white">Pick {fieldLabel} on map</h3>
            <p className="mt-1 text-sm font-medium text-zinc-400">
              Drop or drag the pin, then add a landmark if needed.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white"
            aria-label="Cancel location picker"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="h-[52vh] min-h-[320px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
            <div ref={mapContainerRef} className="h-full w-full" />
          </div>

          <label className="mt-4 block">
            <span className={labelClassName}>Landmark or address note</span>
            <textarea
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="House number, colony, gate, nearby landmark"
              className="mt-2 min-h-20 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-amber-400"
            />
          </label>

          <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-100">
            Pin selected. Add a landmark or address note if needed.
          </div>
        </div>

        <div className="grid gap-2 border-t border-zinc-800 bg-zinc-950 p-4 sm:grid-cols-2 sm:px-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex min-h-12 items-center justify-center rounded-full border border-zinc-800 px-5 text-sm font-bold text-zinc-100 transition-colors hover:bg-zinc-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex min-h-12 items-center justify-center rounded-full bg-amber-400 px-5 text-sm font-black text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isConfirming ? 'Confirming...' : 'Confirm Location'}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: NumericInputValue;
  onChange: (value: NumericInputValue) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className={labelClassName}>{label}</span>
      <div className="relative mt-2">
        {prefix ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
            {prefix}
          </span>
        ) : null}
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.]?[0-9]*"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (isNumericInputDraft(nextValue)) {
              onChange(nextValue);
            }
          }}
          onWheel={handleNumberInputWheel}
          className={cn('pricing-engine-number-input', inputClassName, prefix && 'pl-7', suffix && 'pr-16')}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function NightChargeField({
  amount,
  enabled,
  onAmountChange,
  onEnabledChange,
}: {
  amount: NumericInputValue;
  enabled: boolean;
  onAmountChange: (value: NumericInputValue) => void;
  onEnabledChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 md:col-span-2">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-0 flex-1">
          <span className={labelClassName}>Night Charge</span>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
              ₹
            </span>
            <input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.]?[0-9]*"
              value={amount}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (isNumericInputDraft(nextValue)) {
                  onAmountChange(nextValue);
                }
              }}
              onWheel={handleNumberInputWheel}
              className={cn('pricing-engine-number-input', inputClassName, 'pl-7 pr-16')}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
              / trip
            </span>
          </div>
        </label>

        <button
          type="button"
          onClick={() => onEnabledChange(!enabled)}
          className="flex min-h-10 shrink-0 items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-left transition-colors hover:border-zinc-700 sm:min-w-36"
          aria-pressed={enabled}
        >
          <span className="text-sm font-bold text-zinc-200">{enabled ? 'On' : 'Off'}</span>
          <span
            className={cn(
              'flex h-6 w-11 items-center rounded-full border p-0.5 transition-colors',
              enabled ? 'border-amber-400 bg-amber-400' : 'border-zinc-700 bg-zinc-900'
            )}
          >
            <span
              className={cn(
                'h-[18px] w-[18px] rounded-full bg-white transition-transform',
                enabled ? 'translate-x-5 bg-zinc-950' : 'translate-x-0'
              )}
            />
          </span>
        </button>
      </div>
    </div>
  );
}

function PricingRow({
  icon: Icon,
  label,
  amount,
}: {
  icon: typeof Fuel;
  label: string;
  amount?: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-amber-300">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="truncate text-sm font-bold text-zinc-200">{label}</span>
      </div>
      <span className="shrink-0 text-sm font-black text-zinc-100">
        {typeof amount === 'number' ? formatInr(amount) : '—'}
      </span>
    </div>
  );
}

function MarginModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-9 rounded-lg px-3 text-sm font-black transition-colors',
        active ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
      )}
    >
      {children}
    </button>
  );
}

function ReadOnlyAmount({ label, value }: { label: string; value?: number | null }) {
  return (
    <div>
      <span className={labelClassName}>{label}</span>
      <div className="mt-2 flex h-10 items-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-black text-amber-300">
        {typeof value === 'number' ? formatInr(value) : '—'}
      </div>
    </div>
  );
}

function hasValidRouteEstimate(routeEstimate: RouteEstimate): routeEstimate is ValidRouteEstimate {
  return (
    typeof routeEstimate.distanceKm === 'number' &&
    Number.isFinite(routeEstimate.distanceKm) &&
    typeof routeEstimate.durationMinutes === 'number' &&
    Number.isFinite(routeEstimate.durationMinutes)
  );
}

function isNumericInputDraft(value: string) {
  return /^\d*\.?\d*$/.test(value);
}

function sanitizeConstantCostInputs(inputs: Partial<ConstantCostInputs>): ConstantCostInputs {
  return {
    fuelPricePerLiter: sanitizeNumericInputDraft(inputs.fuelPricePerLiter),
    maintenanceCostPerKm: sanitizeNumericInputDraft(inputs.maintenanceCostPerKm),
    platformCharges: sanitizeNumericInputDraft(inputs.platformCharges),
    profitMargin: sanitizeNumericInputDraft(inputs.profitMargin),
  };
}

function sanitizeNumericInputDraft(value?: string) {
  const nextValue = value ?? '';
  return isNumericInputDraft(nextValue) ? nextValue : '';
}

function overrideMatchesUniversalRouteFilter(override: TripOverride, filter: string) {
  const normalizedFilter = filter.toLowerCase().replace(/\s+/g, ' ').trim();

  if (!normalizedFilter) {
    return true;
  }

  return [override.fromCity, override.toCity].some((city) =>
    city.toLowerCase().includes(normalizedFilter)
  );
}

function readStoredTripOverrides() {
  try {
    const storedTripOverrides = window.localStorage.getItem(TRIP_OVERRIDE_STORAGE_KEY);
    return storedTripOverrides ? sanitizeTripOverrides(JSON.parse(storedTripOverrides)) : [];
  } catch {
    return [];
  }
}

async function loadTripOverridesFromServer() {
  const response = await fetch('/api/admin/trip-overrides', { cache: 'no-store' });
  const data = (await response.json()) as { data?: unknown; error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'Could not load trip overrides');
  }

  return sanitizeTripOverrides(data.data);
}

async function saveTripOverridesToServer(overrides: TripOverride[]) {
  const payload = overrides.map(toTripOverrideApiPayload);

  console.info('[Trip Override UI] PUT /api/admin/trip-overrides request', {
    count: payload.length,
    overrides: payload,
  });

  const response = await fetch('/api/admin/trip-overrides', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides: payload }),
  });
  const data = (await response.json()) as { data?: unknown; error?: string };
  console.info('[Trip Override UI] PUT /api/admin/trip-overrides response', {
    status: response.status,
    ok: response.ok,
    error: data.error,
    data,
  });

  if (!response.ok) {
    throw new Error(data.error ?? 'Could not save trip overrides');
  }

  return sanitizeTripOverrides(data.data);
}

function toTripOverrideApiPayload(override: TripOverride) {
  return {
    id: override.id,
    fromCity: override.fromCity,
    toCity: override.toCity,
    sedanPrice: override.fixedPrice,
    milesXlMarkup: override.milesXlMarkupValue,
    milesXlMarkupType: override.milesXlMarkupType,
    reverseRoute: override.includeReverse,
    active: override.isActive,
  };
}

function handleNumberInputWheel(event: WheelEvent<HTMLInputElement>) {
  event.currentTarget.blur();
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function fetchGeoapifyAddressSuggestions(query: string, signal: AbortSignal): Promise<AddressSuggestion[]> {
  const params = new URLSearchParams({
    text: query,
    format: 'json',
    limit: '6',
    lang: 'en',
    filter: 'countrycode:in',
    apiKey: GEOAPIFY_API_KEY,
  });

  const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error('Address autocomplete failed');
  }

  const data = (await response.json()) as GeoapifyAutocompleteResponse;

  return (data.results ?? [])
    .map((result, index) => createGeoapifyAddressSuggestion(result, index))
    .filter((suggestion): suggestion is AddressSuggestion => Boolean(suggestion));
}

async function reverseGeocodePinnedLocation(latitude: number, longitude: number): Promise<string | null> {
  if (!GEOAPIFY_API_KEY) {
    return null;
  }

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
    lang: 'en',
    apiKey: GEOAPIFY_API_KEY,
  });

  const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${params.toString()}`);

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GeoapifyAutocompleteResponse;
  return data.results?.[0]?.formatted?.trim() || null;
}

function createGeoapifyAddressSuggestion(
  result: GeoapifyAutocompleteResult,
  index: number
): AddressSuggestion | null {
  const resultType = result.result_type?.toLowerCase();
  const isLikelyStreetAddress = Boolean(result.address_line1 && result.address_line1 !== result.city);
  if (isLikelyStreetAddress && resultType && !CITY_RESULT_TYPES.has(resultType)) {
    return null;
  }

  const location = cleanGeoapifyCityLocation(result);
  const latitude = typeof result.lat === 'number' ? result.lat : null;
  const longitude = typeof result.lon === 'number' ? result.lon : null;

  if (!location) {
    return null;
  }

  return {
    id: result.place_id || `${location.displayName}-${index}`,
    formatted: location.displayName,
    latitude,
    longitude,
    placeId: result.place_id ?? '',
    addressLine1: location.city,
    addressLine2: location.state,
    city: location.city,
    state: location.state,
    displayName: location.displayName,
    source: 'autocomplete',
  };
}

async function calculateRouteEstimate(
  pickup: { latitude: number; longitude: number },
  dropoff: { latitude: number; longitude: number },
  signal: AbortSignal
) {
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}?overview=false`,
    { signal }
  );

  if (!response.ok) {
    throw new Error('Route calculation failed');
  }

  const data = (await response.json()) as {
    routes?: Array<{ distance?: number; duration?: number }>;
  };
  const route = data.routes?.[0];

  if (typeof route?.distance !== 'number' || typeof route.duration !== 'number') {
    throw new Error('Route calculation failed');
  }

  return {
    distanceKm: Number((route.distance / 1000).toFixed(1)),
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
  };
}

function shouldShowPickOnMapOption(query: string, suggestions: AddressSuggestion[]) {
  return hasMeaningfulLocationQuery(query) || suggestions.length > 0;
}

function hasMeaningfulLocationQuery(query: string) {
  return normalizeMeaningfulLocationQuery(query).length >= 3;
}

function normalizeMeaningfulLocationQuery(query: string) {
  return query.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getManualPinInitialLocation(
  label: string,
  suggestions: AddressSuggestion[] = [],
  metadata: BookingLocationMetadata
): ManualPinSelection {
  if (typeof metadata.latitude === 'number' && typeof metadata.longitude === 'number') {
    return {
      latitude: metadata.latitude,
      longitude: metadata.longitude,
      label,
    };
  }

  const suggestionWithCoordinates = suggestions.find(
    (suggestion) =>
      typeof suggestion.latitude === 'number' &&
      typeof suggestion.longitude === 'number'
  );

  if (
    suggestionWithCoordinates &&
    typeof suggestionWithCoordinates.latitude === 'number' &&
    typeof suggestionWithCoordinates.longitude === 'number'
  ) {
    return {
      latitude: suggestionWithCoordinates.latitude,
      longitude: suggestionWithCoordinates.longitude,
      label: label || suggestionWithCoordinates.displayName,
    };
  }

  const cityCenter = getPinnedCityCenter(label);
  if (cityCenter) {
    return {
      latitude: cityCenter.latitude,
      longitude: cityCenter.longitude,
      label: label || cityCenter.label,
    };
  }

  return {
    latitude: DEFAULT_PIN_LOCATION.latitude,
    longitude: DEFAULT_PIN_LOCATION.longitude,
    label: label || DEFAULT_PIN_LOCATION.label,
  };
}

function getPinnedCityCenter(query: string) {
  const normalizedQuery = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedQuery) {
    return null;
  }

  return Object.entries(PIN_CITY_CENTERS)
    .sort(([left], [right]) => right.length - left.length)
    .find(([city]) =>
      normalizedQuery === city ||
      normalizedQuery.startsWith(`${city} `) ||
      normalizedQuery.endsWith(` ${city}`) ||
      normalizedQuery.includes(` ${city} `)
    )?.[1] ?? null;
}

function getManualPinConfirmationLabel(selection: ManualPinSelection) {
  return (
    selection.label.trim() ||
    selection.reverseLabel?.trim() ||
    `Map pin: ${selection.latitude.toFixed(2)}, ${selection.longitude.toFixed(2)}`
  );
}

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.max(0, safeNumber(value)));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 1,
  }).format(safeNumber(value));
}
