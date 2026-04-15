'use client';

import { useRef } from 'react';

interface NavLink {
  label: string;
  href: string;
  onClick?: () => void;
}

export function Navbar() {
  const bookingSectionRef = useRef<HTMLElement>(null);

  const scrollToBooking = (type: 'PERSONAL' | 'BUSINESS') => {
    bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Store booking type preference in sessionStorage for form
    sessionStorage.setItem('preferredBookingType', type);
  };

  const scrollToAbout = () => {
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBusinessClick = () => {
    scrollToBooking('BUSINESS');
  };

  const handlePersonalClick = () => {
    scrollToBooking('PERSONAL');
  };

  const handleBookNowClick = () => {
    bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Get existing preference or default
    const existingPriority = sessionStorage.getItem('preferredBookingType') || 'PERSONAL';
    sessionStorage.setItem('preferredBookingType', existingPriority);
  };

  return (
    <nav className="bg-zinc-900 text-white border-b border-zinc-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-zinc-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight">UrbanMile</span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={handlePersonalClick}
              className="text-zinc-300 hover:text-amber-500 transition-colors font-medium text-sm"
            >
              Ride
            </button>
            <button
              onClick={handleBusinessClick}
              className="text-zinc-300 hover:text-amber-500 transition-colors font-medium text-sm"
            >
              Business
            </button>
            <button
              onClick={scrollToAbout}
              className="text-zinc-300 hover:text-amber-500 transition-colors font-medium text-sm"
            >
              About
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <a
              href="tel:+919876543210"
              className="hidden sm:inline-flex items-center px-4 py-2 border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-zinc-900 transition-colors font-medium text-sm rounded-lg"
            >
              Call Now
            </a>
            <button
              onClick={handleBookNowClick}
              className="inline-flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-900 font-medium text-sm rounded-lg transition-colors"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
