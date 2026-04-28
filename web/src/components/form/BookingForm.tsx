'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { CONTACT_PHONE_NUMBER } from '@/lib/contact';
import { bookingLocationMetadataSchema } from '@/lib/bookingLocation';
import { useBookingLocationField } from '@/hooks/useBookingLocationField';

const bookingSchema = z.object({
  bookingType: z.enum(['PERSONAL', 'BUSINESS']),
  fullName: z.string().min(2, 'Please enter a valid name'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number').max(15, 'Phone number too long'),
  pickupLocation: z.string().min(1, 'Please enter pickup location'),
  dropoffLocation: z.string().min(1, 'Please enter drop location'),
  pickupDateTime: z.string().min(1, 'Please select pickup date and time'),
  carType: z.enum(['SEDAN', 'SUV', 'VAN', 'LUXURY']).refine((val) => val !== undefined, {
    message: 'Please select a vehicle type',
  }),
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
type TripType = 'ONE_WAY' | 'ROUND_TRIP';

interface BookingFormProps {
  onBookingSuccess?: () => void;
  onReset?: () => void;
}

export function BookingForm({ onBookingSuccess, onReset }: BookingFormProps) {
  const confirmationRef = useRef<HTMLDivElement>(null);
  const pickupField = useBookingLocationField();
  const dropoffField = useBookingLocationField();
  const [tripType, setTripType] = useState<TripType>('ONE_WAY');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  const [formData, setFormData] = useState<BookingFormData>({
    bookingType: 'PERSONAL',
    fullName: 'UrbanMiles Web Inquiry',
    email: 'booking@urbanmiles.com',
    phone: CONTACT_PHONE_NUMBER,
    pickupLocation: '',
    dropoffLocation: '',
    pickupDateTime: '',
    carType: 'SEDAN',
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'pickupLocation') {
      pickupField.updateAddress(value);
      setPickupLocationError(null);
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
  };

  useEffect(() => {
    if (isSuccess && confirmationRef.current) {
      setTimeout(() => {
        confirmationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isSuccess]);

  const handleClickAnotherBooking = () => {
    setIsSuccess(false);
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
    setIsSubmitting(true);
    setErrors({});

    const result = bookingSchema.safeParse(formData);
    
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
          ...result.data,
          pickupDateTime: new Date(result.data.pickupDateTime).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ pickupDateTime: data.error || 'Something went wrong. Please try again.' });
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      onBookingSuccess?.();
      pickupField.reset();
      dropoffField.reset();
      setPickupDate('');
      setPickupTime('');
      setPickupLocationError(null);
      setFormData((prev) => ({
        bookingType: prev.bookingType,
        fullName: 'UrbanMiles Web Inquiry',
        email: 'booking@urbanmiles.com',
        phone: CONTACT_PHONE_NUMBER,
        pickupLocation: '',
        dropoffLocation: '',
        pickupDateTime: '',
        carType: 'SEDAN',
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
      setErrors({ pickupDateTime: 'Something went wrong. Please try again.' });
      setIsSubmitting(false);
    }
  };

  return (
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
                onClick={() => setTripType(tab.value as TripType)}
                className={cn(
                  'min-h-10 min-w-0 rounded-full px-4 text-sm font-semibold transition-colors',
                  tripType === tab.value
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <BookingField
              name="pickupLocation"
              value={pickupField.address}
              onChange={handleInputChange}
              placeholder="Pickup location"
              error={errors.pickupLocation}
              icon="pickup"
            />
            <BookingField
              name="dropoffLocation"
              value={dropoffField.address}
              onChange={handleInputChange}
              placeholder="Dropoff location"
              error={errors.dropoffLocation}
              icon="dropoff"
            />

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <BookingField
                name="pickupDate"
                type="date"
                value={pickupDate}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                placeholder="Pickup date"
                error={errors.pickupDateTime}
              />
              <BookingField
                name="pickupTime"
                type="time"
                value={pickupTime}
                onChange={handleInputChange}
                placeholder="Pickup time"
                error={!pickupDate ? undefined : errors.pickupDateTime}
              />
            </div>
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

          {formData.pickupDateTime && !errors.pickupDateTime && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Pickup: {formatPickupDateTime(formData.pickupDateTime)}
            </p>
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
  );
}

interface BookingFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: 'pickup' | 'dropoff';
}

function BookingField({ error, icon, className, ...props }: BookingFieldProps) {
  return (
    <div>
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
          className={cn(
            'min-h-11 w-full min-w-0 bg-transparent text-base font-medium text-zinc-950 outline-none placeholder:text-zinc-400',
            'dark:text-white dark:placeholder:text-zinc-500',
            className
          )}
        />
      </div>
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
