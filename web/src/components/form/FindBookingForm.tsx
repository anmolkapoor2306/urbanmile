'use client';

import { FormEvent, useState } from 'react';

type LookupResult = {
  publicBookingId: string;
  customerPublicId: string | null;
  customerName: string | null;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  carType: string;
  fareAmount: number | null;
  status: string;
};

export function FindBookingForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setResult(null);

    try {
      const response = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, bookingId }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(
          data.error ||
            "We couldn't find a booking with those details. Please check your phone number and booking ID."
        );
        return;
      }

      setResult(data.data);
    } catch {
      setMessage("We couldn't find a booking with those details. Please check your phone number and booking ID.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-center rounded-full border border-zinc-200 px-5 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900"
      >
        Find My Booking
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone number"
            className="min-h-12 w-full rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 outline-none focus:border-zinc-950 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-amber-300"
          />
          <input
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value.toUpperCase())}
            placeholder="Booking ID"
            className="min-h-12 w-full rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold uppercase text-zinc-950 outline-none focus:border-zinc-950 focus:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-amber-300"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:opacity-70 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
          >
            {isSubmitting ? 'Checking...' : 'Check Booking'}
          </button>
        </form>
      )}

      {message && (
        <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {message}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-[20px] border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="font-black text-zinc-950 dark:text-white">{result.publicBookingId}</div>
          {result.customerPublicId && (
            <div className="mt-1 font-semibold text-zinc-600 dark:text-zinc-300">
              Customer ID: {result.customerPublicId}
            </div>
          )}
          <div className="mt-3 font-semibold text-zinc-950 dark:text-zinc-100">
            {result.pickupLocation} to {result.dropoffLocation}
          </div>
          <div className="mt-1 text-zinc-600 dark:text-zinc-400">
            {formatLookupDateTime(result.pickupDateTime)} · {result.carType} · {result.status}
          </div>
          <div className="mt-1 text-zinc-600 dark:text-zinc-400">
            Fare {result.fareAmount ? formatMoney(result.fareAmount) : 'pending'}
          </div>
        </div>
      )}
    </div>
  );
}

function formatLookupDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}
