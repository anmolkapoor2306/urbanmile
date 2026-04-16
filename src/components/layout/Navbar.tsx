'use client';

import Link from 'next/link';
import { CONTACT_PHONE_HREF } from '@/lib/contact';

export function Navbar() {
  const scrollToSection = (sectionId: 'ride' | 'business' | 'about') => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4 py-3">
          <div className="shrink-0">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-amber-500">
                <svg className="h-5 w-5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight">UrbanMile</span>
            </Link>
          </div>

          <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
            <button
              type="button"
              onClick={() => scrollToSection('ride')}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-amber-500"
            >
              Ride
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('business')}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-amber-500"
            >
              Business
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-amber-500"
            >
              About
            </button>
          </div>

          <div className="ml-auto hidden md:flex md:items-center">
            <a
              href={CONTACT_PHONE_HREF}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-amber-500 px-4 py-2 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500 hover:text-zinc-900"
            >
              Call Now
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
