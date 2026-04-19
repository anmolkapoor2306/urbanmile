'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

type DashboardPage = 'dashboard' | 'bookings' | 'dispatch' | 'drivers';

interface DashboardHeaderProps {
  title: string;
  currentPage: DashboardPage;
}

const navItems: Array<{ key: DashboardPage; label: string; href: string }> = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin' },
  { key: 'bookings', label: 'Bookings', href: '/admin/bookings' },
  { key: 'dispatch', label: 'Dispatch', href: '/admin/dispatch' },
  { key: 'drivers', label: 'Drivers', href: '/admin/drivers' },
];

export function DashboardHeader({ title, currentPage }: DashboardHeaderProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  function handleNavigate(href: string) {
    router.push(href);
    setIsMenuOpen(false);
  }

  return (
    <header className="border-b border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500" aria-hidden="true"></div>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">UrbanMile</span>
          </div>

          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 md:text-center">{title}</h1>

          <div className="flex items-center justify-start md:justify-end">
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Open dashboard menu"
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((open) => !open)}
                className="inline-flex items-center justify-center rounded-lg bg-zinc-600 px-3 py-2 text-white transition-colors hover:bg-zinc-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>

              <div
                className={cn(
                  'absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-zinc-200 bg-white shadow-lg transition-all duration-150 dark:border-zinc-700 dark:bg-zinc-800',
                  isMenuOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
                )}
              >
                <div className="p-2">
                  {navItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleNavigate(item.href)}
                      className={cn(
                        'block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                        currentPage === item.key
                          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100'
                          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}

                  <div className="my-2 border-t border-zinc-200 dark:border-zinc-700"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
