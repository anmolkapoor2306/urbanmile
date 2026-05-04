import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DashboardHeader, type DashboardPage } from '@/components/admin/DashboardHeader';

export const adminPanelClassName =
  'rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950';

export const adminInsetClassName =
  'rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900';

export const adminInputClassName =
  'w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-500 focus:border-zinc-950 focus:outline-none focus:ring-2 focus:ring-amber-400/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-amber-300';

export const adminSecondaryButtonClassName =
  'rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-950 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-800';

export const adminPanelHeaderClassName = 'mb-4 flex shrink-0 items-start justify-between gap-4';

export function AdminPageFrame({
  currentPage,
  children,
}: {
  currentPage: DashboardPage;
  children: ReactNode;
}) {
  return (
    <div className="grid h-screen w-full max-w-full overflow-hidden bg-zinc-50 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-100 lg:grid-cols-[auto_minmax(0,1fr)]">
      <DashboardHeader currentPage={currentPage} />

      <main className="h-screen min-w-0 overflow-hidden">
        <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden px-4 pb-4 pt-16 sm:px-6 lg:px-6 lg:py-5 xl:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AdminStatsGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-6 grid w-full shrink-0 grid-cols-2 gap-3', className)}>{children}</div>;
}

export function AdminStatCard({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(adminPanelClassName, 'flex flex-col justify-center p-3', className)}>
      <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-black text-zinc-950 dark:text-zinc-100">{value}</div>
    </div>
  );
}

export function AdminPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn(adminPanelClassName, className)}>{children}</section>;
}

export function AdminControlsBar({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn(adminPanelClassName, 'px-5 py-4', className)}>{children}</section>;
}
