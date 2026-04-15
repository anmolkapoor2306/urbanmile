'use client';

import { Navbar } from '@/components/layout/Navbar';
import { BookingForm } from '@/components/form/BookingForm';
import { useState, useEffect } from 'react';
import type { BookingType } from '@/types';

export default function Home() {
  const [bookingType, setBookingType] = useState<BookingType>('PERSONAL');

  useEffect(() => {
    const storedType = sessionStorage.getItem('preferredBookingType') as BookingType | null;
    if (storedType === 'BUSINESS' || storedType === 'PERSONAL') {
      setBookingType(storedType);
      sessionStorage.removeItem('preferredBookingType');
    }
  }, []);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-900">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="bg-zinc-900 pt-20 sm:pt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-full text-zinc-300 text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            Available 24/7 Across India
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            UrbanMile - Your Reliable Ride
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Professional, reliable, and comfortable rides across India. 
            Book your journey with confidence.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#book-ride"
              className="inline-flex items-center justify-center px-8 py-4 bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-amber-500/25"
            >
              Book Your Ride Now
            </a>
          </div>
        </div>
      </section>

      {/* Booking Form Section */}
      <section id="book-ride" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-20">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-2xl p-6 sm:p-8 md:p-10 border border-zinc-200 dark:border-zinc-700">
          <BookingForm defaultBookingType={bookingType} />
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              title: 'Quick & Easy Booking',
              description: 'Complete your booking in minutes. Our streamlined process gets you confirmed fast.',
            },
            {
              icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: 'Safe & Verified',
              description: 'All our vehicles are inspected regularly, and our drivers are thoroughly vetted.',
            },
            {
              icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              ),
              title: 'Transparent Pricing',
              description: 'No hidden charges. Fare is clear and confirmed before your journey begins.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white dark:bg-zinc-800 rounded-lg p-6 text-center border border-zinc-200 dark:border-zinc-700 hover:shadow-md transition-shadow"
            >
              <div className="mx-auto w-14 h-14 bg-zinc-100 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-4 text-zinc-700 dark:text-zinc-300">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {feature.title}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-zinc-100 dark:bg-zinc-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-8">
            About UrbanMile
          </h2>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed mb-6">
              We are a trusted taxi service provider operating across major cities in India. 
              Since 2020, we have been committed to delivering safe, reliable, and comfortable 
              transportation for both personal and business travel needs.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed">
              Our fleet includes well-maintained sedans, SUVs, and luxury vehicles, all 
              driven by experienced and professional chauffeurs. We prioritize customer 
              satisfaction, punctuality, and safety in every journey.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-zinc-50 dark:bg-zinc-900 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-zinc-900 dark:text-zinc-100 mb-4">
            Simple Journey in Three Steps
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 text-center mb-12 text-lg">
            We make booking your ride effortless
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Fill Booking Details', description: 'Enter your pickup and drop locations along with your contact information.' },
              { step: '2', title: 'Confirmation Call', description: 'Our team will verify your booking and confirm within 5 minutes.' },
              { step: '3', title: 'Comfortable Ride', description: 'Our driver meets you at pickup and takes you safely to your destination.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  {item.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-zinc-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              &copy; 2026 UrbanMile. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="/admin" className="text-sm text-amber-500 hover:text-amber-400 transition-colors">
                Admin Dashboard
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
