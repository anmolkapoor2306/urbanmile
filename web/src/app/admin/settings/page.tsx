import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CreditCard,
  Database,
  FileText,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { isCurrentAdminAuthenticated, getCurrentAdminSession } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import { AdminPageFrame } from '@/components/admin/AdminLayout';

export const dynamic = 'force-dynamic';

const settingsCards = [
  {
    title: 'Business Profile',
    description: 'Company details, support contacts, operating cities, and public booking preferences.',
    icon: BriefcaseBusiness,
    accentClassName: 'bg-amber-500 text-zinc-950',
  },
  {
    title: 'Driver Rules',
    description: 'Assignment rules, availability defaults, driver status handling, and dispatch constraints.',
    icon: ShieldCheck,
    accentClassName: 'bg-emerald-500 text-zinc-950',
  },
  {
    title: 'Payment Settings',
    description: 'Payment methods, collection policies, payout defaults, and finance controls.',
    icon: CreditCard,
    accentClassName: 'bg-sky-500 text-zinc-950',
  },
  {
    title: 'Notifications',
    description: 'Customer updates, admin alerts, dispatch messages, and operational reminders.',
    icon: Bell,
    accentClassName: 'bg-violet-500 text-white',
  },
  {
    title: 'Security',
    description: 'Session policies, admin access rules, password controls, and audit protections.',
    icon: LockKeyhole,
    accentClassName: 'bg-rose-500 text-white',
  },
  {
    title: 'System Preferences',
    description: 'Timezone, formatting, dashboard defaults, booking behavior, and workflow preferences.',
    icon: SlidersHorizontal,
    accentClassName: 'bg-cyan-500 text-zinc-950',
  },
  {
    title: 'Document Settings',
    description: 'Invoice details, booking documents, driver paperwork, and export templates.',
    icon: FileText,
    accentClassName: 'bg-orange-500 text-zinc-950',
  },
  {
    title: 'Data Management',
    description: 'Import tools, retention rules, backups, cleanup jobs, and data visibility settings.',
    icon: Database,
    accentClassName: 'bg-lime-500 text-zinc-950',
  },
  {
    title: 'Admin Management',
    description: 'Admin users, roles, permissions, ownership controls, and team access settings.',
    icon: Users,
    accentClassName: 'bg-indigo-500 text-white',
    href: '/admin/settings/admin-management',
  },
] as const;

export default async function SettingsPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'settings')) redirect('/admin/forbidden');

  return (
    <AdminPageFrame currentPage="settings" adminRole={session?.role}>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl">
          <div className="shrink-0 border-b border-zinc-800 px-5 py-5 sm:px-6 lg:px-7">
            <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Settings</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                  Manage your business preferences, rules, payment settings, and admin configuration from one place.
                </p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-amber-400">
                <Settings2 className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6">
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {settingsCards.map((card) => {
                const Icon = card.icon;

                return (
                  <article
                    key={card.title}
                    className="flex min-h-[230px] min-w-0 flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-lg transition-colors hover:border-zinc-700"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${card.accentClassName}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-black text-white">{card.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">{card.description}</p>
                      </div>
                    </div>

                    {'href' in card ? (
                      <Link
                        href={card.href}
                        className="mt-auto flex min-h-11 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-bold text-zinc-200 shadow-sm transition-colors hover:border-zinc-700 hover:bg-zinc-800"
                      >
                        <span>Manage</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled
                        title="Coming soon"
                        className="mt-auto flex min-h-11 w-full items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-bold text-zinc-300 shadow-sm transition-colors disabled:cursor-not-allowed"
                      >
                        <span>Manage</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </AdminPageFrame>
  );
}
