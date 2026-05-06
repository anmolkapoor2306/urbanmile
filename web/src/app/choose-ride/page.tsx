'use client';

import { Navbar } from '@/components/layout/Navbar';
import { BookingForm } from '@/components/form/BookingForm';

export default function ChooseRidePage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <Navbar />
      <BookingForm mode="ride-options" />
    </div>
  );
}
