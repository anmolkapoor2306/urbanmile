import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AdminPageFrame, AdminPanel } from '@/components/admin/AdminLayout';
import { OperationsControl } from '@/components/admin/OperationsControl';
import { getCurrentAdminSession, isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import { getOperationalZones } from '@/lib/operationalZones';
import type { SerializedOperationalZone } from '@/lib/operationalZoneRules';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function OperationsControlPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'dispatch')) redirect('/admin/forbidden');

  let zones: SerializedOperationalZone[] = [];
  let loadError: string | null = null;

  try {
    zones = await getOperationalZones(prisma);
  } catch (error) {
    console.warn('Failed to load operational zones:', error instanceof Error ? error.message : error);
    loadError = 'Operational zones could not be loaded. Apply the latest database migration and try again.';
  }

  return (
    <AdminPageFrame currentPage="dispatch" adminRole={session?.role}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-4 shrink-0">
          <Link
            href="/admin/dispatch"
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dispatch
          </Link>
        </div>
        {loadError ? (
          <AdminPanel className="mb-6 shrink-0 border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 shadow-none">
            {loadError}
          </AdminPanel>
        ) : null}
        <OperationsControl initialZones={zones} />
      </div>
    </AdminPageFrame>
  );
}
