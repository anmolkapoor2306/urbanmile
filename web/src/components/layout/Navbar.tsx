'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { CONTACT_PHONE_HREF } from '@/lib/contact';
import { useTheme } from '@/context/ThemeContext';
import { FindBookingFormModal } from '@/components/form/FindBookingForm';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [findBookingOpen, setFindBookingOpen] = useState(false);

  const scrollToSection = (sectionId: 'ride' | 'about') => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
    <nav className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/95 text-zinc-950 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-white">
      <div className="mx-auto w-full max-w-[1536px] px-4 md:px-5 lg:px-8">
        <div className="flex min-h-[72px] items-center justify-between gap-3 py-4">
          <div className="shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-950 text-amber-400 dark:bg-white dark:text-zinc-950">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8m-9-4h10l-1.3-4.2A2.5 2.5 0 0013.3 7h-2.6a2.5 2.5 0 00-2.4 1.8L7 13zm1 0v3m8-3v3M6 16h1m10 0h1" />
                </svg>
              </div>
              <span className="text-base font-bold tracking-tight sm:text-lg">UrbanMiles</span>
            </Link>
          </div>

          <div className="hidden flex-1 items-center justify-center gap-12 md:flex">
            <button
              type="button"
              onClick={() => scrollToSection('ride')}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
            >
              Ride
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
            >
              About
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white sm:h-11 sm:w-11"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFindBookingOpen(true)}
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900 sm:min-h-11 sm:px-5"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Find Booking</span>
            </button>
            <a
              href={CONTACT_PHONE_HREF}
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 sm:min-h-11 sm:px-5"
            >
              Call Now
            </a>
          </div>
        </div>
      </div>
    </nav>

    <FindBookingFormModal isOpen={findBookingOpen} onClose={() => setFindBookingOpen(false)} />
  </>
  );
}
