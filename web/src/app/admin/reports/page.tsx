import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  return (
    <AdminPageFrame currentPage="reports">
      <AdminEmptyState
        title="Reports"
        description="Reports will summarize completed trips, revenue, assignment speed, cancellations, driver utilization, and customer trends once report exports are wired."
      />
    </AdminPageFrame>
  );
}
