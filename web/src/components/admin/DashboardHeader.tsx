'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import {
  BarChart3,
  CalendarCheck,
  Car,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Route,
  Settings,
  Sun,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

export type DashboardPage =
  | 'dashboard'
  | 'dispatch'
  | 'bookings'
  | 'drivers'
  | 'fleet'
  | 'customers'
  | 'finance'
  | 'reports'
  | 'settings';

interface DashboardHeaderProps {
  currentPage: DashboardPage;
}

const navItems: Array<{
  key: DashboardPage;
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}> = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { key: 'dispatch', label: 'Dispatch', href: '/admin/dispatch', icon: Route },
  { key: 'bookings', label: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
  { key: 'drivers', label: 'Drivers', href: '/admin/drivers', icon: Users },
  { key: 'fleet', label: 'Fleet', href: '/admin/fleet', icon: Car },
  { key: 'customers', label: 'Customers', href: '/admin/customers', icon: UserRound },
  { key: 'finance', label: 'Finance', href: '/admin/finance', icon: Wallet },
  { key: 'reports', label: 'Reports', href: '/admin/reports', icon: BarChart3 },
  { key: 'settings', label: 'Settings', href: '/admin/settings', icon: Settings },
];

const SIDEBAR_STORAGE_KEY = 'urbanmiles-admin-sidebar-expanded';
const SIDEBAR_STORAGE_EVENT = 'urbanmiles-admin-sidebar-change';

function subscribeToSidebarState(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(SIDEBAR_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(SIDEBAR_STORAGE_EVENT, onStoreChange);
  };
}

function getSidebarSnapshot() {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) ?? 'true';
}

function getServerSidebarSnapshot() {
  return 'true';
}

export function DashboardHeader({ currentPage }: DashboardHeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const sidebarSnapshot = useSyncExternalStore(subscribeToSidebarState, getSidebarSnapshot, getServerSidebarSnapshot);
  const isPinnedOpen = sidebarSnapshot !== 'false';
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const isExpanded = isPinnedOpen || isHoverOpen;
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  function toggleExpanded() {
    const nextPinnedState = !isPinnedOpen;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextPinnedState));
    if (!nextPinnedState) {
      setIsHoverOpen(false);
    }
    window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
  }

  function handleSidebarMouseEnter() {
    if (!isPinnedOpen) {
      setIsHoverOpen(true);
    }
  }

  function handleSidebarMouseLeave() {
    if (!isPinnedOpen) {
      setIsHoverOpen(false);
    }
  }

  function closeMobileMenu() {
    setIsMobileOpen(false);
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          aria-label="Open admin navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin" className="flex items-center gap-2 text-sm font-black text-zinc-950 dark:text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950 text-amber-400 dark:bg-white dark:text-zinc-950">
            <Route className="h-4 w-4" aria-hidden="true" />
          </span>
          UrbanMiles
        </Link>
        <div className="h-10 w-10" aria-hidden="true" />
      </div>

      {isMobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-950/45 lg:hidden"
          onClick={closeMobileMenu}
          aria-label="Close admin navigation"
        />
      ) : null}

      <aside
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] shrink-0 transition-[width,transform] duration-300 ease-out lg:relative lg:z-40 lg:translate-x-0 lg:overflow-visible',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isPinnedOpen ? 'lg:w-[260px]' : 'lg:w-[72px]'
        )}
      >
        <div
          className={cn(
            'flex h-full w-[260px] min-w-0 flex-col overflow-x-hidden border-r border-zinc-200 bg-white transition-[width,box-shadow] duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-950',
            isExpanded ? 'lg:w-[260px]' : 'lg:w-[72px] lg:min-w-[72px]',
            !isPinnedOpen && isHoverOpen && 'lg:absolute lg:inset-y-0 lg:left-0 lg:shadow-xl'
          )}
        >
        <div className={cn('flex h-16 shrink-0 items-center gap-3 border-b border-zinc-200 px-3 dark:border-zinc-800', isExpanded ? 'lg:justify-between' : 'lg:justify-center')}>
          <Link
            href="/admin"
            onClick={closeMobileMenu}
            className={cn('flex min-w-0 flex-1 items-center gap-3', !isExpanded && 'lg:hidden')}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-amber-400 dark:bg-white dark:text-zinc-950">
              <Route className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className={cn('min-w-0 text-lg font-black text-zinc-950 dark:text-white', !isExpanded && 'lg:hidden')}>
              UrbanMiles
            </span>
          </Link>
          <button
            type="button"
            onClick={toggleExpanded}
            className={cn(
              'hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900 lg:flex',
              !isExpanded && 'lg:mx-auto'
            )}
            aria-label={isPinnedOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={isPinnedOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={closeMobileMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 lg:hidden"
            aria-label="Close admin navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="dashboard-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 py-3" aria-label="Admin navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;

            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={closeMobileMenu}
                title={item.label}
                className={cn(
                  'group relative flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors',
                  isExpanded ? 'lg:justify-start' : 'lg:justify-center',
                  isActive
                    ? 'bg-zinc-950 text-white dark:bg-amber-400 dark:text-zinc-950'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className={cn('truncate', !isExpanded && 'lg:hidden')}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className={cn(
              'group relative flex min-h-10 w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900',
              isExpanded ? 'lg:justify-start' : 'lg:justify-center'
            )}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            <span className={cn('truncate', !isExpanded && 'lg:hidden')}>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className={cn(
              'group relative flex min-h-10 w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-red-900/60 dark:hover:bg-red-950/30 dark:hover:text-red-200',
              isExpanded ? 'lg:justify-start' : 'lg:justify-center'
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={cn('truncate', !isExpanded && 'lg:hidden')}>Logout</span>
          </button>
        </div>
        </div>
      </aside>
    </>
  );
}
