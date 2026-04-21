'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export type DashboardPage = 'dashboard' | 'bookings' | 'dispatch' | 'drivers';

interface DashboardHeaderProps {
  currentPage: DashboardPage;
}

const navItems: Array<{ key: DashboardPage; label: string; href: string }> = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin' },
  { key: 'bookings', label: 'Bookings', href: '/admin/bookings' },
  { key: 'dispatch', label: 'Dispatch', href: '/admin/dispatch' },
  { key: 'drivers', label: 'Drivers', href: '/admin/drivers' },
];

export function DashboardHeader({ currentPage }: DashboardHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95 shadow-[0_10px_35px_rgba(0,0,0,0.22)] backdrop-blur-sm">
      <div className="w-full px-6 py-4 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/admin" className="flex w-fit items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-950">
            <div className="h-8 w-8 rounded-lg bg-amber-500" aria-hidden="true"></div>
            <span className="text-xl font-bold text-zinc-100">UrbanMile</span>
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-end lg:gap-6">
            <nav className="flex flex-wrap items-center gap-2" aria-label="Admin navigation">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    currentPage === item.key
                      ? 'bg-zinc-100 text-zinc-950'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center justify-start lg:justify-end">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-medium text-zinc-100 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
