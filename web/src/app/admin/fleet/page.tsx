import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated, getCurrentAdminSession } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { FleetManagementClient } from './FleetManagementClient';

export const dynamic = 'force-dynamic';

export default async function FleetPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'fleet')) redirect('/admin/forbidden');

  return (
    <AdminPageFrame currentPage="fleet" adminRole={session?.role}>
      <FleetManagementClient />
    </AdminPageFrame>
  );
}
