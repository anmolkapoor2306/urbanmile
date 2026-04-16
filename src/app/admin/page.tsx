import { redirect } from 'next/navigation';
import {
  clearCurrentAdminSession,
  getCurrentAdminCookieHeader,
  isCurrentAdminAuthenticated,
} from '@/lib/adminAuth';
import Link from 'next/link';
import { BookingTable } from '@/components/admin/BookingTable';

export const dynamic = 'force-dynamic';

interface AdminBooking {
  id: string;
  bookingReference: string;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: string;
  carType: string;
  specialInstructions: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export default async function AdminPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const cookieHeader = await getCurrentAdminCookieHeader();

  const [bookingsResponse] = await Promise.all([
    fetch(`${BASE_URL}/api/bookings?limit=1000`, {
      headers: {
        cookie: cookieHeader,
      },
      cache: 'no-store',
    }),
  ]);

  if (!bookingsResponse.ok) {
    redirect('/admin/login');
  }

  const bookingsData = await bookingsResponse.json();

  if (!bookingsData.success || !bookingsData.data) {
    redirect('/admin/login');
  }

  const bookings = bookingsData.data;
  const stats: Stats = calculateStats(bookings);

  async function handleLogout() {
    'use server';
    await clearCurrentAdminSession();
    redirect('/admin/login');
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-900">
      <header className="bg-white dark:bg-zinc-800 shadow-sm border-b border-zinc-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Back to Website
              </Link>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </Link>
              <form action={handleLogout}>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-700 text-white font-medium transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Bookings', value: stats.total, color: 'emerald' },
              { label: 'Pending', value: stats.pending, color: 'yellow' },
              { label: 'Confirmed', value: stats.confirmed, color: 'blue' },
              { label: 'Completed', value: stats.completed, color: 'green' },
              { label: 'Cancelled', value: stats.cancelled, color: 'red' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm border border-zinc-200 dark:border-zinc-700"
              >
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  {stat.label}
                </div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                All Bookings
              </h2>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}
              </span>
            </div>
            <BookingTable bookings={bookings} />
          </div>
      </main>
    </div>
  );
}

function calculateStats(data: AdminBooking[]): Stats {
  return {
    total: data.length,
    pending: data.filter((b: AdminBooking) => b.status === 'PENDING').length,
    confirmed: data.filter((b: AdminBooking) => b.status === 'CONFIRMED').length,
    completed: data.filter((b: AdminBooking) => b.status === 'COMPLETED').length,
    cancelled: data.filter((b: AdminBooking) => b.status === 'CANCELLED').length,
  };
}
