import { redirect } from 'next/navigation';
import { AdminPageFrame, AdminPanel } from '@/components/admin/AdminLayout';
import { OperationsControl } from '@/components/admin/OperationsControl';
import { getCurrentAdminSession, isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import { getOperationalZones, getServiceControlConfig } from '@/lib/operationalZones';
import type { SerializedOperationalZone, SerializedServiceControlConfig } from '@/lib/operationalZoneRules';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function OperationsControlPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'dispatch')) redirect('/admin/forbidden');

  let zones: SerializedOperationalZone[] = [];
  let config: SerializedServiceControlConfig = { allowIndiaWideBooking: false };
  let loadError: string | null = null;

  try {
    zones = await getOperationalZones(prisma);
    config = await getServiceControlConfig(prisma);
  } catch (error) {
    console.warn('Failed to load service areas:', error instanceof Error ? error.message : error);
    loadError = 'Service areas could not be loaded. Apply the latest database migration and try again.';
  }

  return (
    <AdminPageFrame currentPage="service-control" adminRole={session?.role}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {loadError ? (
          <AdminPanel className="mb-6 shrink-0 border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 shadow-none">
            {loadError}
          </AdminPanel>
        ) : null}
        <OperationsControl initialZones={zones} initialConfig={config} />
      </div>
    </AdminPageFrame>
  );
}
