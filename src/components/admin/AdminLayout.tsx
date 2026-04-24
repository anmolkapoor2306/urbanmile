import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DashboardHeader, type DashboardPage } from '@/components/admin/DashboardHeader';

export const adminPanelClassName =
  'rounded-2xl border border-zinc-800/90 bg-zinc-900/80 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-sm';

export const adminInsetClassName =
  'rounded-2xl border border-zinc-800 bg-zinc-950/70 shadow-[0_12px_30px_rgba(0,0,0,0.18)]';

export const adminInputClassName =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500';

export const adminSecondaryButtonClassName =
  'rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-900';

export const adminPanelHeaderClassName = 'mb-4 flex shrink-0 items-start justify-between gap-4';

export function AdminPageFrame({
  currentPage,
  children,
}: {
  currentPage: DashboardPage;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <DashboardHeader currentPage={currentPage} />

      <main className="flex flex-1 w-full min-h-0 min-w-0 overflow-hidden">
        <div className="flex flex-1 w-full h-full min-h-0 min-w-0 flex-col px-6 py-6 lg:px-8 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AdminStatsGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mb-6 grid w-full shrink-0 grid-cols-2 gap-4', className)}>{children}</div>;
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
    <div className={cn(adminPanelClassName, 'p-4 flex flex-col justify-center items-center text-center', className)}>
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

export function AdminPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn(adminPanelClassName, className)}>{children}</section>;
}

export function AdminControlsBar({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn(adminPanelClassName, 'px-5 py-4', className)}>{children}</section>;
}
