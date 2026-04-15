'use client';

import { useState, FormEvent } from 'react';
import { z } from 'zod';
import { Input } from './Input';
import { Select } from './Select';
import { Textarea } from './Textarea';
import { Button } from './Button';

type BookingType = 'PERSONAL' | 'BUSINESS';

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
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  defaultBookingType?: BookingType;
  onSuccess?: (booking: BookingFormData) => void;
}

export function BookingForm({ defaultBookingType = 'PERSONAL', onSuccess }: BookingFormProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    bookingType: defaultBookingType,
    fullName: '',
    email: '',
    phone: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupDateTime: '',
    carType: 'SEDAN',
    specialInstructions: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof BookingFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleBookingTypeChange = (type: BookingType) => {
    setFormData((prev) => ({ ...prev, bookingType: type }));
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
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...result.data,
          pickupDateTime: new Date(result.data.pickupDateTime).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors({ pickupDateTime: data.error || 'Failed to create booking' });
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      onSuccess?.(result.data);
      setFormData({
        bookingType: defaultBookingType,
        fullName: '',
        email: '',
        phone: '',
        pickupLocation: '',
        dropoffLocation: '',
        pickupDateTime: '',
        carType: 'SEDAN',
        specialInstructions: '',
      });
      setIsSubmitting(false);
    } catch {
      setErrors({ pickupDateTime: 'Network error. Please try again.' });
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-8 text-center border border-zinc-200 dark:border-zinc-700">
        <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-amber-600 dark:text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          Booking Received!
        </h3>
        <p className="text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
          We have received your booking request. Our team will contact you shortly to confirm your reservation.
        </p>
        <button
          onClick={() => setIsSuccess(false)}
          className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 hover:underline font-medium"
        >
          Make another booking
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Book Your Ride
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Fill in the details below for a quick and easy booking experience.
          </p>
        </div>

        <div className="md:col-span-2">
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors border ${
                formData.bookingType === 'PERSONAL'
                  ? 'bg-amber-500 border-amber-500 text-zinc-900'
                  : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-amber-500'
              }`}
              onClick={() => handleBookingTypeChange('PERSONAL')}
            >
              Personal Booking
            </button>
            <button
              type="button"
              className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors border ${
                formData.bookingType === 'BUSINESS'
                  ? 'bg-amber-500 border-amber-500 text-zinc-900'
                  : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:border-amber-500'
              }`}
              onClick={() => handleBookingTypeChange('BUSINESS')}
            >
              Business Booking
            </button>
          </div>
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
          <Input
            label="Pickup Date & Time"
            name="pickupDateTime"
            type="datetime-local"
            value={formData.pickupDateTime}
            onChange={handleInputChange}
            min={new Date().toISOString().split('T')[0] + 'T00:00'}
            error={errors.pickupDateTime}
          />
        </div>

        <div className="md:col-span-2">
          <Input
            label="Pickup Location"
            name="pickupLocation"
            value={formData.pickupLocation}
            onChange={handleInputChange}
            placeholder={undefined}
            data-placeholder="Flat 302, Green Park Apartments, Sector 62, Noida"
            error={errors.pickupLocation}
            fullWidth
          />
        </div>

        <div className="md:col-span-2">
          <Input
            label="Drop Location"
            name="dropoffLocation"
            value={formData.dropoffLocation}
            onChange={handleInputChange}
            placeholder={undefined}
            data-placeholder="Terminal 3, IGI Airport, New Delhi"
            error={errors.dropoffLocation}
            fullWidth
          />
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

      <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <Button type="submit" isLoading={isSubmitting} size="lg" fullWidth className="md:flex md:w-auto">
          Book Now
        </Button>
      </div>
    </form>
  );
}
