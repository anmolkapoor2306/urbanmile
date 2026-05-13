import { redirect } from 'next/navigation';
import { getCurrentAdminSession, isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { AdminManagementClient } from '@/components/admin/AdminManagementClient';
import { serializeAdminUser } from '@/lib/adminUsers';
import { listAdminUsersForManagement } from '@/lib/adminUsers.server';

export const dynamic = 'force-dynamic';

export default async function AdminManagementPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (!session || !hasPermission(session.role, 'users:write')) {
    redirect('/admin/forbidden');
  }

  const admins = await listAdminUsersForManagement();

  return (
    <AdminPageFrame currentPage="settings" adminRole={session.role}>
      <AdminManagementClient initialAdmins={admins.map(serializeAdminUser)} currentUserId={session.userId} />
    </AdminPageFrame>
  );
}
