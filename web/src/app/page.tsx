'use client';

import Image from 'next/image';
import { Clock, Headphones, IndianRupee, ShieldCheck } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { BookingForm } from '@/components/form/BookingForm';

const features = [
  {
    title: 'Safe & Secure',
    description: 'Verified rides with a careful operations team behind every trip.',
    Icon: ShieldCheck,
  },
  {
    title: '24/7 Availability',
    description: 'Book airport, city, and outstation rides any time you need one.',
    Icon: Clock,
  },
  {
    title: 'Transparent Pricing',
    description: 'Clear estimates and confirmation before your journey begins.',
    Icon: IndianRupee,
  },
  {
    title: 'Customer Support',
    description: 'A real support team for coordination, changes, and assistance.',
    Icon: Headphones,
  },
];

export default function Home() {
  return (
    <main className="public-home min-h-screen overflow-x-hidden bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <Navbar />

      <section id="ride" className="relative flex min-h-[calc(100vh-80px)] items-center bg-zinc-50 py-12 dark:bg-zinc-900 lg:py-16">
        <div className="mx-auto grid w-full max-w-[1536px] grid-cols-1 items-start gap-8 px-4 md:px-5 lg:grid-cols-[minmax(520px,600px)_minmax(640px,760px)] lg:justify-between lg:gap-16 lg:px-8">
          <div className="min-w-0 w-full">
            <div className="w-full max-w-[560px] space-y-4">
              <span className="inline-flex items-center gap-2 self-start rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-300">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Available 24/7
              </span>

              <h1 className="max-w-full text-4xl font-black leading-[1.02] tracking-tight text-zinc-950 dark:text-white min-[420px]:text-5xl sm:text-5xl lg:text-5xl xl:text-6xl">
                Your Ride.
                <br />
                Our Responsibility.
              </h1>

              <p className="max-w-[520px] text-base leading-7 text-zinc-600 dark:text-zinc-300 sm:text-lg sm:leading-8">
                Clean cars, clear pricing, and quick support for city, airport, and outstation rides.
              </p>

              <div className="w-full max-w-[560px] rounded-[28px] border border-zinc-200 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.13)] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/30">
                <BookingForm />
              </div>
            </div>
          </div>

          <div className="relative h-[680px] w-full min-w-0 self-start overflow-hidden rounded-3xl shadow-xl">
            <Image
              src="/images/new_car.png"
              alt="UrbanMiles Car"
              fill
              priority
              sizes="(min-width: 1024px) 760px, 100vw"
              className="object-cover object-center"
            />
          </div>
        </div>
      </section>

      <section className="bg-white pb-20 pt-8 dark:bg-zinc-950 sm:pb-24 lg:pt-16">
        <div className="mx-auto grid w-full max-w-[1536px] gap-5 px-4 md:px-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-[24px] border border-zinc-200 bg-white p-7 shadow-sm shadow-zinc-950/[0.03] dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10">
                <feature.Icon className="h-5 w-5 text-yellow-500" />
              </div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="about" className="border-t border-zinc-200 bg-zinc-50 py-20 dark:border-zinc-800 dark:bg-zinc-900 sm:py-24">
        <div className="mx-auto grid w-full max-w-[1536px] gap-12 px-4 md:px-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-end lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">About UrbanMiles</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
              A simpler way to book dependable taxi rides.
            </h2>
          </div>
          <p className="max-w-3xl text-lg leading-9 text-zinc-600 dark:text-zinc-300">
            UrbanMiles focuses on the essentials: clean vehicles, professional coordination, punctual pickups, and transparent trip communication from request to dropoff.
          </p>
        </div>
      </section>

      <footer className="bg-white py-8 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
        <div className="mx-auto flex w-full max-w-[1536px] flex-col gap-3 border-t border-zinc-200 px-4 pt-8 text-sm dark:border-zinc-800 md:px-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="font-semibold text-zinc-950 dark:text-white">UrbanMiles</p>
          <p>&copy; 2026 UrbanMiles. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
