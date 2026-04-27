'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import {
  bookingLocationMetadataSchema,
  getLocationUpgradeHint,
} from '@/lib/bookingLocation';
import { useBookingLocationField } from '@/hooks/useBookingLocationField';
import { Input } from './Input';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { Button } from './Button';

const carTypeOptions: { value: string; label: string }[] = [
  { value: 'SEDAN', label: 'Sedan' },
  { value: 'SUV', label: 'MUV / SUV' },
  { value: 'VAN', label: 'Large Vehicle' },
  { value: 'LUXURY', label: 'Premium Vehicle' },
];

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

interface BookingFormProps {
  onBookingSuccess?: () => void;
  onReset?: () => void;
}

export function BookingForm({ onBookingSuccess, onReset }: BookingFormProps) {
  const confirmationRef = useRef<HTMLDivElement>(null);
  const pickupDateTimeInputRef = useRef<HTMLInputElement>(null);
  const pickupField = useBookingLocationField();
  const dropoffField = useBookingLocationField();

  const [formData, setFormData] = useState<BookingFormData>({
    bookingType: 'PERSONAL',
    fullName: '',
    email: '',
    phone: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupDateTime: '',
    carType: 'SEDAN',
    specialInstructions: '',
    pickupLatitude: null,
    pickupLongitude: null,
    pickupPlaceId: '',
    pickupLocationSource: 'manual',
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
      setFormData((prev) => ({ ...prev, dropoffLocation: value }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name as keyof BookingFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
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
        specialInstructions: '',
        pickupLatitude: null,
        pickupLongitude: null,
        pickupPlaceId: '',
        pickupLocationSource: 'manual',
      }));
      setIsSubmitting(false);
    } catch {
      setErrors({ pickupDateTime: 'Something went wrong. Please try again.' });
      setIsSubmitting(false);
    }
  };

  return (
              <form
                onSubmit={handleSubmit}
                className="space-y-8"
              >
      {isSuccess ? (
      <div
        ref={confirmationRef}
        className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50/80 px-6 py-10 text-center shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 sm:px-10 sm:py-12"
      >
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <svg className="h-8 w-8 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            Booking Received!
          </h3>
          <p className="max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
            We have received your booking request. Our team will contact you shortly to confirm your reservation.
          </p>
          <div className="mt-8 flex justify-center">
            <Button type="button" onClick={handleClickAnotherBooking} size="lg" className="w-full sm:w-auto sm:min-w-[220px]">
              Make Another Booking
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Book Your Ride
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Fill in the details below for a quick and easy booking experience.
            </p>
          </div>

          <div className="md:col-span-2">
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              placeholder={undefined}
              data-placeholder="Rajesh Kumar"
              error={errors.fullName}
              fullWidth
            />
          </div>

          <div className="md:col-span-2">
            <Input
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={undefined}
              data-placeholder="rajesh@example.com"
              error={errors.email}
              fullWidth
            />
          </div>

          <div>
            <Input
              label="Mobile Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder={undefined}
              data-placeholder="+91 98765 43210"
              error={errors.phone}
            />
          </div>

          <div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pickupDateTime" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Pickup Date & Time
              </label>
              <input
                ref={pickupDateTimeInputRef}
                id="pickupDateTime"
                name="pickupDateTime"
                type="datetime-local"
                value={formData.pickupDateTime}
                onChange={(e) => {
                  handleInputChange(e);

                  if (e.target.value) {
                    setTimeout(() => {
                      pickupDateTimeInputRef.current?.blur();
                    }, 0);
                  }
                }}
                min={new Date().toISOString().split('T')[0] + 'T00:00'}
                aria-invalid={!!errors.pickupDateTime}
                aria-describedby="pickupDateTime-help"
                className={cn(
                  'w-full min-w-0 rounded-lg border px-3 py-2.5 text-base transition-colors',
                  'bg-white dark:bg-zinc-800',
                  'border-zinc-300 dark:border-zinc-700',
                  'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'dark:text-white',
                  errors.pickupDateTime && 'border-red-500 focus:ring-red-500'
                )}
              />
              <div id="pickupDateTime-help" className="min-h-[24px]">
                {errors.pickupDateTime ? (
                  <span className="text-sm text-red-600 dark:text-red-400">{errors.pickupDateTime}</span>
                ) : formData.pickupDateTime ? (
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Selected: {formatPickupDateTime(formData.pickupDateTime)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <Input
              label="Pickup Location"
              name="pickupLocation"
              value={pickupField.address}
              onChange={handleInputChange}
              placeholder={undefined}
              data-placeholder="Flat 302, Green Park Apartments, Sector 62, Noida"
              error={errors.pickupLocation}
              fullWidth
            />
            <Button
              type="button"
              onClick={handleUseCurrentLocation}
              isLoading={isLocatingPickup}
              fullWidth
              className="mt-2"
            >
              📍 {isLocatingPickup ? 'Getting location...' : 'Use Current Location'}
            </Button>
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Uses your device location when permission is granted.
            </p>
            {pickupLocationError && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{pickupLocationError}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <Input
              label="Drop Location"
              name="dropoffLocation"
              value={dropoffField.address}
              onChange={handleInputChange}
              placeholder={undefined}
              data-placeholder="Terminal 3, IGI Airport, New Delhi"
              error={errors.dropoffLocation}
              fullWidth
            />
            <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {getLocationUpgradeHint('dropoff')}
            </p>
          </div>

          <div className="md:col-span-2">
            <Select
              label="Vehicle Type"
              id="carType"
              options={carTypeOptions}
              value={formData.carType}
              onChange={(value: string) => {
                setFormData((prev) => ({ ...prev, carType: value as typeof formData.carType }));
                if (errors.carType) {
                  setErrors((prev) => ({ ...prev, carType: undefined }));
                }
              }}
              error={errors.carType}
            />
          </div>

          <div className="md:col-span-2">
            <Textarea
              label="Special Instructions"
              name="specialInstructions"
              value={formData.specialInstructions}
              onChange={handleInputChange}
              placeholder={undefined}
              data-placeholder="2 luggage bags, airport pickup, prefer female driver"
              rows={3}
            />
          </div>
        </div>
      )}

      {!isSuccess && (
        <div className="flex justify-center border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <Button type="submit" isLoading={isSubmitting} size="lg" className="w-full sm:w-auto sm:min-w-[220px]">
            Book Now
          </Button>
        </div>
      )}
    </form>
  );
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
