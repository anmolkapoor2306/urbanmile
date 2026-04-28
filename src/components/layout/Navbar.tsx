'use client';

import Link from 'next/link';
import { CONTACT_PHONE_HREF } from '@/lib/contact';
import { useTheme } from '@/context/ThemeContext';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();

  const scrollToSection = (sectionId: 'ride' | 'about') => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4 py-3">
          <div className="shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-500">
                <svg className="h-5 w-5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
               <span className="text-lg font-bold tracking-tight">UrbanMiles</span>
            </Link>
          </div>

          <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
            <button
              type="button"
              onClick={() => scrollToSection('ride')}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-amber-600 dark:text-zinc-300 dark:hover:text-amber-500"
            >
              Ride
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-amber-600 dark:text-zinc-300 dark:hover:text-amber-500"
            >
              About
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
            <a
              href={CONTACT_PHONE_HREF}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-500 px-4 py-2 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-500 hover:text-zinc-900 dark:text-amber-400"
            >
              Call Now
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
