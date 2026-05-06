import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { FleetManagementClient } from './FleetManagementClient';

export const dynamic = 'force-dynamic';

export default async function FleetPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  return (
    <AdminPageFrame currentPage="fleet">
      <FleetManagementClient />
    </AdminPageFrame>
  );
}
