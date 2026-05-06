'use client';

import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <Navbar />
      <section className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-3xl items-center px-4 py-12 md:px-5">
        <div className="w-full rounded-[28px] border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
            UrbanMiles account
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-zinc-950 dark:text-white">
            Login / Sign Up
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-zinc-600 dark:text-zinc-400">
            Customer accounts are coming soon. You can still book a ride with phone verification and check existing bookings from the navbar.
          </p>
          <Link
            href="/#ride"
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-bold text-white transition-colors hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
          >
            Book a Ride
          </Link>
        </div>
      </section>
    </main>
  );
}
