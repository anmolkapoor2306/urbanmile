'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { CalendarClock, ChevronDown, X } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { bookingLocationMetadataSchema } from '@/lib/bookingLocation';
import { useBookingLocationField } from '@/hooks/useBookingLocationField';
import {
  getFixedCitySuggestions,
  getFixedRoutePrice,
  type FixedRoutePrice,
} from '@/lib/fixedRoutePricing';

const bookingSchema = z.object({
  bookingType: z.enum(['PERSONAL', 'BUSINESS']),
  fullName: z.string().min(2, 'Please enter a valid name'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone: z.string().min(10, 'Please enter a valid phone number').max(15, 'Phone number too long'),
  pickupLocation: z.string().min(1, 'Please enter pickup location'),
  dropoffLocation: z.string().min(1, 'Please enter drop location'),
  pickupDateTime: z.string().min(1, 'Please select pickup date and time'),
  carType: z.enum(['SEDAN', 'SUV', 'VAN', 'LUXURY']).refine((val) => val !== undefined, {
    message: 'Please select a vehicle type',
  }),
  fareAmount: z.number().positive().optional(),
  specialInstructions: z.string().optional(),
  pickupLatitude: bookingLocationMetadataSchema.shape.latitude,
  pickupLongitude: bookingLocationMetadataSchema.shape.longitude,
  pickupPlaceId: bookingLocationMetadataSchema.shape.placeId,
  pickupLocationSource: bookingLocationMetadataSchema.shape.source,
  dropoffLatitude: bookingLocationMetadataSchema.shape.latitude,
  dropoffLongitude: bookingLocationMetadataSchema.shape.longitude,
  dropoffPlaceId: bookingLocationMetadataSchema.shape.placeId,
  dropoffLocationSource: bookingLocationMetadataSchema.shape.source,
});

type BookingFormData = z.infer<typeof bookingSchema>;
type BookingMode = 'ONE_WAY' | 'ROUND_TRIP';
type PickupTiming = 'NOW' | 'LATER';
type RideOption = 'SEDAN' | 'SUV';
type LocationFieldName = 'pickupLocation' | 'dropoffLocation';
type BookingResponseItem = {
  id?: string;
  bookingReference?: string;
};

interface BookingFormProps {
  onBookingSuccess?: () => void;
  onReset?: () => void;
}

export function BookingForm({ onBookingSuccess, onReset }: BookingFormProps) {
  const confirmationRef = useRef<HTMLDivElement>(null);
  const pickupTimingMenuRef = useRef<HTMLDivElement>(null);
  const pickupField = useBookingLocationField();
  const dropoffField = useBookingLocationField();
  const [bookingMode, setBookingMode] = useState<BookingMode>('ONE_WAY');
  const [pickupTiming, setPickupTiming] = useState<PickupTiming>('NOW');
  const [isPickupTimingOpen, setIsPickupTimingOpen] = useState(false);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [priceQuote, setPriceQuote] = useState<FixedRoutePrice | null>(null);
  const [selectedRide, setSelectedRide] = useState<RideOption>('SEDAN');
  const [routeMessage, setRouteMessage] = useState<string | null>(null);
  const [activeLocationField, setActiveLocationField] = useState<LocationFieldName | null>(null);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingReferences, setBookingReferences] = useState<string[]>([]);

  const [formData, setFormData] = useState<BookingFormData>({
    bookingType: 'PERSONAL',
    fullName: '',
    email: '',
    phone: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupDateTime: '',
    carType: 'SEDAN',
    fareAmount: undefined,
    specialInstructions: '',
    pickupLatitude: null,
    pickupLongitude: null,
    pickupPlaceId: '',
    pickupLocationSource: 'manual',
    dropoffLatitude: null,
    dropoffLongitude: null,
    dropoffPlaceId: '',
    dropoffLocationSource: 'manual',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [pickupLocationError, setPickupLocationError] = useState<string | null>(null);
  const [isLocatingPickup, setIsLocatingPickup] = useState(false);

  const finalPrice = priceQuote ? priceQuote.sedanPrice + (selectedRide === 'SUV' ? 1000 : 0) : 0;
  const totalPrice = bookingMode === 'ROUND_TRIP' ? finalPrice * 2 : finalPrice;
  const activeLocationValue =
    activeLocationField === 'pickupLocation'
      ? pickupField.address
      : activeLocationField === 'dropoffLocation'
        ? dropoffField.address
        : '';
  const activeLocationSuggestions = activeLocationField
    ? getFixedCitySuggestions(activeLocationValue).slice(0, 8)
    : [];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setBookingError(null);

    if (name === 'pickupLocation') {
      pickupField.updateAddress(value);
      setPickupLocationError(null);
      setRouteMessage(null);
      setPriceQuote(null);
      setFormData((prev) => ({
        ...prev,
        pickupLocation: value,
        pickupLatitude: null,
        pickupLongitude: null,
        pickupPlaceId: '',
        pickupLocationSource: 'manual',
      }));
    } else if (name === 'dropoffLocation') {
      dropoffField.updateAddress(value);
      setRouteMessage(null);
      setPriceQuote(null);
      setFormData((prev) => ({
        ...prev,
        dropoffLocation: value,
        dropoffLatitude: null,
        dropoffLongitude: null,
        dropoffPlaceId: '',
        dropoffLocationSource: 'manual',
      }));
    } else if (name === 'pickupDate') {
      setPickupDate(value);
      setFormData((prev) => ({ ...prev, pickupDateTime: buildPickupDateTime(value, pickupTime) }));
    } else if (name === 'pickupTime') {
      setPickupTime(value);
      setFormData((prev) => ({ ...prev, pickupDateTime: buildPickupDateTime(pickupDate, value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    const errorName = name === 'pickupDate' || name === 'pickupTime' ? 'pickupDateTime' : name;

    if (errors[errorName as keyof BookingFormData]) {
      setErrors((prev) => ({ ...prev, [errorName]: undefined }));
    }

    if (name === 'pickupLocation' || name === 'dropoffLocation') {
      setActiveLocationField(name);
      setHighlightedSuggestionIndex(0);
    }
  };

  const handleLocationSuggestionSelect = (fieldName: LocationFieldName, cityName: string) => {
    if (fieldName === 'pickupLocation') {
      pickupField.updateAddress(cityName);
      setPickupLocationError(null);
      setFormData((prev) => ({
        ...prev,
        pickupLocation: cityName,
        pickupLatitude: null,
        pickupLongitude: null,
        pickupPlaceId: '',
        pickupLocationSource: 'manual',
      }));
    } else {
      dropoffField.updateAddress(cityName);
      setFormData((prev) => ({
        ...prev,
        dropoffLocation: cityName,
        dropoffLatitude: null,
        dropoffLongitude: null,
        dropoffPlaceId: '',
        dropoffLocationSource: 'manual',
      }));
    }

    setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    setRouteMessage(null);
    setPriceQuote(null);
    setActiveLocationField(null);
    setHighlightedSuggestionIndex(0);
  };

  const handleLocationFieldKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    fieldName: LocationFieldName
  ) => {
    if (activeLocationField !== fieldName || activeLocationSuggestions.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedSuggestionIndex((index) => (index + 1) % activeLocationSuggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedSuggestionIndex((index) =>
        index === 0 ? activeLocationSuggestions.length - 1 : index - 1
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      handleLocationSuggestionSelect(fieldName, activeLocationSuggestions[highlightedSuggestionIndex]);
    } else if (event.key === 'Escape') {
      setActiveLocationField(null);
    }
  };

  const handlePickupTimingChange = (value: PickupTiming) => {
    setPickupTiming(value);
    setIsPickupTimingOpen(false);
    setFormData((prev) => ({
      ...prev,
      pickupDateTime: value === 'NOW' ? '' : prev.pickupDateTime,
    }));

    if (value === 'NOW') {
      setErrors((prev) => ({ ...prev, pickupDateTime: undefined }));
    }
  };

  useEffect(() => {
    if (!isPickupTimingOpen) {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (
        pickupTimingMenuRef.current &&
        !pickupTimingMenuRef.current.contains(event.target as Node)
      ) {
        setIsPickupTimingOpen(false);
      }
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPickupTimingOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [isPickupTimingOpen]);

  useEffect(() => {
    if (isSuccess && confirmationRef.current) {
      setTimeout(() => {
        confirmationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isSuccess]);

  const handleClickAnotherBooking = () => {
    setIsSuccess(false);
    setBookingReferences([]);
    onReset?.();
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setPickupLocationError('Location is not supported on this device/browser.');
      return;
    }

    setIsLocatingPickup(true);
    setPickupLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        const fallbackLabel = `Current Location (${latitude}, ${longitude})`;

        pickupField.setResolvedLocation(fallbackLabel, {
          latitude,
          longitude,
          source: 'current-location',
        });

        setFormData((prev) => ({
          ...prev,
          pickupLocation: fallbackLabel,
          pickupLatitude: latitude,
          pickupLongitude: longitude,
          pickupPlaceId: '',
          pickupLocationSource: 'current-location',
        }));

        setErrors((prev) => ({ ...prev, pickupLocation: undefined }));
        setRouteMessage(null);
        setPriceQuote(null);
        setIsLocatingPickup(false);
      },
      (error) => {
        const errorMessage =
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Please enter pickup manually.'
            : 'Unable to get your current location right now. Please enter pickup manually.';

        pickupField.markCurrentLocationRequested();
        setPickupLocationError(errorMessage);
        setIsLocatingPickup(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setRouteMessage(null);

    const pickupDateTime =
      pickupTiming === 'NOW' ? new Date().toISOString() : formData.pickupDateTime;

    const routeErrors: Partial<Record<keyof BookingFormData, string>> = {};
    if (!formData.pickupLocation.trim()) {
      routeErrors.pickupLocation = 'Please enter pickup location';
    }
    if (!formData.dropoffLocation.trim()) {
      routeErrors.dropoffLocation = 'Please enter drop location';
    }
    if (pickupTiming === 'LATER' && !pickupDateTime) {
      routeErrors.pickupDateTime = 'Please select pickup date and time';
    }

    if (Object.keys(routeErrors).length > 0) {
      setErrors(routeErrors);
      return;
    }

    const fixedRoutePrice = getFixedRoutePrice(formData.pickupLocation, formData.dropoffLocation);

    if (!fixedRoutePrice) {
      setPriceQuote(null);
      setRouteMessage('Price not available for this route yet. Call support or try later.');
      return;
    }

    setSelectedRide('SEDAN');
    setPriceQuote(fixedRoutePrice);
    setFormData((prev) => ({
      ...prev,
      pickupDateTime,
      carType: 'SEDAN',
      fareAmount: fixedRoutePrice.sedanPrice,
    }));
  };

  const handleBookNow = async () => {
    if (!priceQuote) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setBookingError(null);

    const pickupDateTime =
      pickupTiming === 'NOW' ? new Date().toISOString() : formData.pickupDateTime;
    const result = bookingSchema.safeParse({
      ...formData,
      pickupDateTime,
      carType: selectedRide,
      fareAmount: finalPrice,
    });

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof BookingFormData, string>> = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as keyof BookingFormData;
        if (fieldName in formData) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/bookings/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingType: result.data.bookingType,
          fullName: result.data.fullName,
          email: result.data.email,
          phone: result.data.phone,
          pickupLocation: result.data.pickupLocation,
          dropoffLocation: result.data.dropoffLocation,
          pickupDateTime: new Date(result.data.pickupDateTime).toISOString(),
          carType: selectedRide,
          fareAmount: finalPrice,
          specialInstructions: result.data.specialInstructions,
          pickupLatitude: result.data.pickupLatitude,
          pickupLongitude: result.data.pickupLongitude,
          pickupPlaceId: result.data.pickupPlaceId,
          pickupLocationSource: result.data.pickupLocationSource,
          dropoffLatitude: result.data.dropoffLatitude,
          dropoffLongitude: result.data.dropoffLongitude,
          dropoffPlaceId: result.data.dropoffPlaceId,
          dropoffLocationSource: result.data.dropoffLocationSource,
          bookingMode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setBookingError("We couldn't create your booking right now. Please try again or call support.");
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      const createdBookings: BookingResponseItem[] = Array.isArray(data.data) ? data.data : [data.data];
      setBookingReferences(
        createdBookings
          .map((booking) => booking?.bookingReference ?? booking?.id)
          .filter((reference): reference is string => Boolean(reference))
      );
      setPriceQuote(null);
      setRouteMessage(null);
      setBookingError(null);
      onBookingSuccess?.();
      pickupField.reset();
      dropoffField.reset();
      setPickupDate('');
      setPickupTime('');
      setBookingMode('ONE_WAY');
      setPickupTiming('NOW');
      setSelectedRide('SEDAN');
      setPickupLocationError(null);
      setFormData((prev) => ({
        bookingType: prev.bookingType,
        fullName: '',
        email: '',
        phone: '',
        pickupLocation: '',
        dropoffLocation: '',
        pickupDateTime: '',
        carType: 'SEDAN',
        fareAmount: undefined,
        specialInstructions: '',
        pickupLatitude: null,
        pickupLongitude: null,
        pickupPlaceId: '',
        pickupLocationSource: 'manual',
        dropoffLatitude: null,
        dropoffLongitude: null,
        dropoffPlaceId: '',
        dropoffLocationSource: 'manual',
      }));
      setIsSubmitting(false);
    } catch {
      setBookingError("We couldn't create your booking right now. Please try again or call support.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-4">
      {isSuccess ? (
        <div
          ref={confirmationRef}
          className="flex flex-col items-center justify-center rounded-[26px] border border-amber-100 bg-amber-50 px-8 py-12 text-center shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20"
        >
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-amber-600 shadow-sm dark:bg-zinc-900">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mb-3 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
            Request received
          </h3>
          <p className="max-w-md text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            We have your route details. Our team will confirm availability and pricing shortly.
          </p>
          {bookingReferences.length > 0 && (
            <div className="mt-4 space-y-2">
              {bookingReferences.map((reference) => (
                <p
                  key={reference}
                  className="rounded-full bg-white px-4 py-2 text-sm font-bold text-zinc-950 shadow-sm dark:bg-zinc-900 dark:text-zinc-100"
                >
                  Booking reference: {reference}
                </p>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleClickAnotherBooking}
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Start another search
          </button>
        </div>
      ) : (
        <div className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-full bg-zinc-100 p-1 dark:bg-zinc-900">
            {[
              { value: 'ONE_WAY', label: 'One Way' },
              { value: 'ROUND_TRIP', label: 'Round Trip' },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  const nextMode = tab.value as BookingMode;
                  setBookingMode(nextMode);
                  setFormData((prev) => ({ ...prev, bookingMode: nextMode }));
                }}
                className={cn(
                  'min-h-10 min-w-0 rounded-full px-4 text-sm font-semibold transition-colors',
                  bookingMode === tab.value
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div ref={pickupTimingMenuRef} className="relative w-[184px] max-w-full">
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isPickupTimingOpen}
                onClick={() => setIsPickupTimingOpen((isOpen) => !isOpen)}
                className={cn(
                  'flex h-12 w-full items-center justify-between gap-3 rounded-[20px] border border-zinc-200 bg-white px-4 text-sm font-semibold leading-none text-zinc-950 shadow-sm shadow-zinc-950/5 outline-none transition-colors',
                  'hover:border-zinc-300 hover:bg-zinc-50 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-950/5',
                  'dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:shadow-black/20 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:focus:border-amber-300 dark:focus:ring-amber-300/10'
                )}
              >
                <CalendarClock className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-left">
                  {pickupTiming === 'NOW' ? 'Pickup now' : 'Schedule later'}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-zinc-500 transition-transform dark:text-zinc-400',
                    isPickupTimingOpen && 'rotate-180'
                  )}
                  aria-hidden="true"
                />
              </button>

              {isPickupTimingOpen && (
                <div
                  role="listbox"
                  aria-label="Pickup timing"
                  className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-[18px] border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30"
                >
                  {[
                    { value: 'NOW', label: 'Pickup now' },
                    { value: 'LATER', label: 'Schedule later' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={pickupTiming === option.value}
                      onClick={() => handlePickupTimingChange(option.value as PickupTiming)}
                      className={cn(
                        'flex min-h-10 w-full items-center rounded-[14px] px-3 text-left text-sm font-semibold text-zinc-950 transition-colors',
                        'hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none',
                        'dark:text-white dark:hover:bg-zinc-900 dark:focus:bg-zinc-900',
                        pickupTiming === option.value && 'bg-zinc-100 dark:bg-zinc-900'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <BookingField
              name="pickupLocation"
              value={pickupField.address}
              onChange={handleInputChange}
              onFocus={() => {
                setActiveLocationField('pickupLocation');
                setHighlightedSuggestionIndex(0);
              }}
              onBlur={() => window.setTimeout(() => setActiveLocationField(null), 120)}
              onKeyDown={(event) => handleLocationFieldKeyDown(event, 'pickupLocation')}
              placeholder="Pickup location"
              error={errors.pickupLocation}
              icon="pickup"
              suggestions={activeLocationField === 'pickupLocation' ? activeLocationSuggestions : []}
              highlightedSuggestionIndex={highlightedSuggestionIndex}
              onSuggestionSelect={(cityName) => handleLocationSuggestionSelect('pickupLocation', cityName)}
            />
            <BookingField
              name="dropoffLocation"
              value={dropoffField.address}
              onChange={handleInputChange}
              onFocus={() => {
                setActiveLocationField('dropoffLocation');
                setHighlightedSuggestionIndex(0);
              }}
              onBlur={() => window.setTimeout(() => setActiveLocationField(null), 120)}
              onKeyDown={(event) => handleLocationFieldKeyDown(event, 'dropoffLocation')}
              placeholder="Dropoff location"
              error={errors.dropoffLocation}
              icon="dropoff"
              suggestions={activeLocationField === 'dropoffLocation' ? activeLocationSuggestions : []}
              highlightedSuggestionIndex={highlightedSuggestionIndex}
              onSuggestionSelect={(cityName) => handleLocationSuggestionSelect('dropoffLocation', cityName)}
            />

            {pickupTiming === 'LATER' && (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <BookingField
                  name="pickupDate"
                  type="date"
                  value={pickupDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Pickup date"
                  error={errors.pickupDateTime}
                  required
                />
                <BookingField
                  name="pickupTime"
                  type="time"
                  value={pickupTime}
                  onChange={handleInputChange}
                  placeholder="Pickup time"
                  error={!pickupDate ? undefined : errors.pickupDateTime}
                  required
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocatingPickup}
            className="inline-flex min-h-8 items-center justify-center rounded-full px-1 text-sm font-semibold text-zinc-600 transition-colors hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:text-white"
          >
            {isLocatingPickup ? 'Getting current location...' : 'Use current location'}
          </button>

          {pickupLocationError && (
            <p className="text-sm text-red-600 dark:text-red-400">{pickupLocationError}</p>
          )}

          {pickupTiming === 'LATER' && formData.pickupDateTime && !errors.pickupDateTime && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Pickup: {formatPickupDateTime(formData.pickupDateTime)}
            </p>
          )}

          {routeMessage && (
            <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              {routeMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-13 w-full items-center justify-center rounded-full bg-zinc-950 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-zinc-950/15 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
          >
            {isSubmitting ? 'Checking...' : 'See Prices'}
          </button>
        </div>
      )}
    </form>
    {priceQuote && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 px-4 py-6 backdrop-blur-sm">
        <div className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl shadow-zinc-950/25 dark:bg-zinc-950 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-zinc-950 dark:text-white">Choose your ride</h3>
              <div className="mt-3 space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Pickup:</span> {formData.pickupLocation}</p>
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Dropoff:</span> {formData.dropoffLocation}</p>
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Ride type:</span> {bookingMode === 'ROUND_TRIP' ? 'Round Trip' : 'One Way'}</p>
                <p><span className="font-semibold text-zinc-950 dark:text-zinc-100">Pickup mode:</span> {pickupTiming === 'NOW' ? 'Pickup now' : formatPickupDateTime(formData.pickupDateTime)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPriceQuote(null)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
              aria-label="Close ride selection"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { value: 'SEDAN', label: 'Sedan / Hatchback', price: priceQuote.sedanPrice },
              { value: 'SUV', label: 'SUV', price: priceQuote.sedanPrice + 1000 },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  const nextRide = option.value as RideOption;
                  setSelectedRide(nextRide);
                  setFormData((prev) => ({
                    ...prev,
                    carType: nextRide,
                    fareAmount: option.price,
                  }));
                }}
                className={cn(
                  'rounded-[20px] border p-4 text-left transition-colors',
                  selectedRide === option.value
                    ? 'border-amber-400 bg-amber-50 shadow-sm dark:border-amber-300 dark:bg-amber-400/10'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700'
                )}
              >
                <span className="block text-base font-bold text-zinc-950 dark:text-white">{option.label}</span>
                <span className="mt-2 block text-2xl font-black text-zinc-950 dark:text-amber-200">
                  {formatMoney(option.price)}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-[20px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Outgoing price</span>
                <span className="text-base font-bold text-zinc-950 dark:text-white">{formatMoney(finalPrice)}</span>
              </div>
              {bookingMode === 'ROUND_TRIP' && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Return price</span>
                  <span className="text-base font-bold text-zinc-950 dark:text-white">{formatMoney(finalPrice)}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3 border-t border-zinc-200 pt-2 dark:border-zinc-800">
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Total price</span>
                <span className="text-2xl font-black text-zinc-950 dark:text-white">{formatMoney(totalPrice)}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <BookingField
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder="Name"
              error={errors.fullName}
              required
            />
            <BookingField
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Phone"
              error={errors.phone}
              required
            />
            <BookingField
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Email optional"
              error={errors.email}
            />
            <div className="sm:col-span-2">
              <textarea
                name="specialInstructions"
                value={formData.specialInstructions ?? ''}
                onChange={handleInputChange}
                placeholder="Note optional"
                className={cn(
                  'min-h-24 w-full resize-none rounded-[20px] border border-zinc-200 bg-zinc-50 px-5 py-4 text-base font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400',
                  'focus:border-zinc-950 focus:bg-white focus:ring-4 focus:ring-zinc-950/5',
                  'dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-amber-300 dark:focus:bg-zinc-950 dark:focus:ring-amber-300/10'
                )}
              />
            </div>
          </div>

          {bookingError && (
            <div className="mt-5 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {bookingError}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setPriceQuote(null)}
              className="flex min-h-12 items-center justify-center rounded-full border border-zinc-200 px-6 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleBookNow}
              disabled={isSubmitting}
              className="flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-bold text-white shadow-xl shadow-zinc-950/15 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              {isSubmitting ? 'Booking...' : 'Book Now'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

interface BookingFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: 'pickup' | 'dropoff';
  suggestions?: string[];
  highlightedSuggestionIndex?: number;
  onSuggestionSelect?: (cityName: string) => void;
}

function BookingField({
  error,
  icon,
  className,
  suggestions = [],
  highlightedSuggestionIndex = 0,
  onSuggestionSelect,
  ...props
}: BookingFieldProps) {
  return (
    <div className="relative">
      <div
        className={cn(
          'flex min-h-13 items-center gap-4 rounded-[20px] border bg-zinc-50 px-5 transition-colors',
          'border-zinc-200 focus-within:border-zinc-950 focus-within:bg-white focus-within:ring-4 focus-within:ring-zinc-950/5',
          'dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-amber-300 dark:focus-within:bg-zinc-950 dark:focus-within:ring-amber-300/10',
          error && 'border-red-300 focus-within:border-red-500 focus-within:ring-red-500/10'
        )}
      >
        {icon && (
          <span
            className={cn(
              'h-3 w-3 shrink-0 rounded-full',
              icon === 'pickup' ? 'bg-zinc-950 dark:bg-white' : 'bg-amber-500'
            )}
          />
        )}
        <input
          {...props}
          aria-invalid={!!error}
          aria-autocomplete={suggestions.length > 0 ? 'list' : undefined}
          aria-expanded={suggestions.length > 0 ? true : undefined}
          className={cn(
            'min-h-11 w-full min-w-0 bg-transparent text-base font-medium text-zinc-950 outline-none placeholder:text-zinc-400',
            'dark:text-white dark:placeholder:text-zinc-500',
            className
          )}
        />
      </div>
      {suggestions.length > 0 && onSuggestionSelect && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[18px] border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30"
        >
          {suggestions.map((cityName, index) => (
            <button
              key={cityName}
              type="button"
              role="option"
              aria-selected={index === highlightedSuggestionIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSuggestionSelect(cityName)}
              className={cn(
                'flex min-h-10 w-full items-center rounded-[14px] px-3 text-left text-sm font-semibold text-zinc-950 transition-colors',
                'hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none',
                'dark:text-white dark:hover:bg-zinc-900 dark:focus:bg-zinc-900',
                index === highlightedSuggestionIndex && 'bg-zinc-100 dark:bg-zinc-900'
              )}
            >
              {cityName}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

function buildPickupDateTime(date: string, time: string) {
  if (!date || !time) {
    return '';
  }

  return `${date}T${time}`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPickupDateTime(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate);
}
