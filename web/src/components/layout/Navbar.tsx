'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, X } from 'lucide-react';
import { CONTACT_PHONE_HREF } from '@/lib/contact';
import { useTheme } from '@/context/ThemeContext';
import { FindBookingFormModal } from '@/components/form/FindBookingForm';

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [findBookingOpen, setFindBookingOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openFindBooking = () => {
    setFindBookingOpen(true);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/95 text-zinc-950 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-white">
        <div className="mx-auto w-full max-w-[1536px] px-4 md:px-5 lg:px-8">
          <div className="flex min-h-[72px] items-center justify-between gap-3 py-4">
            <div className="shrink-0">
              <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-zinc-950 text-amber-400 dark:bg-white dark:text-zinc-950">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17h8m-9-4h10l-1.3-4.2A2.5 2.5 0 0013.3 7h-2.6a2.5 2.5 0 00-2.4 1.8L7 13zm1 0v3m8-3v3M6 16h1m10 0h1" />
                  </svg>
                </div>
                <span className="text-base font-bold tracking-tight sm:text-lg">UrbanMiles</span>
              </Link>
            </div>

            <div className="hidden flex-1 items-center justify-center gap-12 lg:flex">
              <NavLink href="/#ride">Ride</NavLink>
              <NavLink href="/#help">Help</NavLink>
              <NavLink href="/#about">About</NavLink>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <a
                href={CONTACT_PHONE_HREF}
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 lg:min-h-11 lg:px-5"
              >
                Call Now
              </a>
              <button
                type="button"
                onClick={openFindBooking}
                className="hidden min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900 md:inline-flex lg:min-h-11 lg:px-5"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Find Booking
              </button>
              <Link
                href="/login"
                className="hidden min-h-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-900 md:inline-flex lg:min-h-11 lg:px-5"
              >
                Login / Sign Up
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white md:inline-flex lg:h-11 lg:w-11"
                aria-label="Toggle theme"
              >
                <ThemeIcon theme={theme} />
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:hover:text-white md:hidden"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="border-t border-zinc-200 pb-4 pt-2 dark:border-zinc-800 md:hidden">
              <div className="grid gap-1">
                <MobileLink href="/#ride" onClick={() => setMobileMenuOpen(false)}>Ride</MobileLink>
                <MobileLink href="/#help" onClick={() => setMobileMenuOpen(false)}>Help</MobileLink>
                <MobileLink href="/#about" onClick={() => setMobileMenuOpen(false)}>About</MobileLink>
                <button
                  type="button"
                  onClick={openFindBooking}
                  className="flex min-h-11 items-center justify-between rounded-[16px] px-3 text-left text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  Find Booking
                  <Search className="h-4 w-4 text-zinc-500" aria-hidden="true" />
                </button>
                <MobileLink href="/login" onClick={() => setMobileMenuOpen(false)}>Login / Sign Up</MobileLink>
                <button
                  type="button"
                  onClick={() => {
                    toggleTheme();
                    setMobileMenuOpen(false);
                  }}
                  className="flex min-h-11 items-center justify-between rounded-[16px] px-3 text-left text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
                >
                  Theme
                  <ThemeIcon theme={theme} />
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <FindBookingFormModal isOpen={findBookingOpen} onClose={() => setFindBookingOpen(false)} />
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex min-h-11 items-center rounded-[16px] px-3 text-sm font-bold text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900"
    >
      {children}
    </Link>
  );
}

function ThemeIcon({ theme }: { theme: 'dark' | 'light' }) {
  return theme === 'dark' ? (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9 0 008.354-5.646z" />
    </svg>
  );
}
