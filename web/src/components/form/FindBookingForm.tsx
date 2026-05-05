'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';

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

export function FindBookingFormModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [phone, setPhone] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPhone('');
      setBookingId('');
      setResult(null);
      setMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setResult(null);

    try {
      const response = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, bookingId: bookingId.toUpperCase() }),
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

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 px-4 py-6 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="w-full max-w-[420px] overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl shadow-zinc-950/25 dark:bg-zinc-950 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h3 className="text-2xl font-bold text-zinc-950 dark:text-white">Find Booking</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone number"
            className="min-h-12 w-full rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 transition-all duration-200 outline-none focus:border-zinc-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950/20 dark:border-zinc-700 dark:bg-neutral-900 dark:text-white dark:focus:border-amber-300 dark:focus:bg-neutral-900 dark:focus:outline-none dark:focus:ring-2 dark:focus:ring-amber-500"
          />
          <input
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
            placeholder="Booking ID"
            className="min-h-12 w-full rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 placeholder:text-zinc-400 transition-all duration-200 outline-none focus:border-zinc-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-950/20 dark:border-zinc-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-amber-300 dark:focus:bg-neutral-900 dark:focus:outline-none dark:focus:ring-2 dark:focus:ring-amber-500"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-12 w-full items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Checking...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                Search Booking
              </>
            )}
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            {message}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-1 rounded-[20px] border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="font-black text-zinc-950 dark:text-white">{result.publicBookingId}</div>
            {result.customerPublicId && (
              <div className="font-semibold text-zinc-600 dark:text-zinc-300">
                Customer ID: {result.customerPublicId}
              </div>
            )}
            <div className="font-semibold text-zinc-950 dark:text-zinc-100">
              {result.pickupLocation} to {result.dropoffLocation}
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">
              {formatLookupDateTime(result.pickupDateTime)} &middot; {result.carType} &middot; {result.status}
            </div>
            <div className="text-zinc-600 dark:text-zinc-400">
              Fare {result.fareAmount ? formatMoney(result.fareAmount) : 'pending'}
            </div>
          </div>
        )}
      </div>
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
