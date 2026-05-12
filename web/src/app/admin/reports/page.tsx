import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated, getCurrentAdminSession } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'reports')) redirect('/admin/forbidden');

  return (
    <AdminPageFrame currentPage="reports" adminRole={session?.role}>
      <AdminEmptyState
        title="Reports"
        description="Reports will summarize completed trips, revenue, assignment speed, cancellations, driver utilization, and customer trends once report exports are wired."
      />
    </AdminPageFrame>
  );
}
