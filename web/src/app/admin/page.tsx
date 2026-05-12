import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated, getCurrentAdminSession } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import { AdminPageFrame, AdminPanel } from '@/components/admin/AdminLayout';
import { MainDashboard } from '@/components/admin/MainDashboard';
import { loadAdminDashboardDataSafely } from './loadDashboardData';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'dashboard')) redirect('/admin/forbidden');
  const dashboardData = await loadAdminDashboardDataSafely();

  return (
    <AdminPageFrame currentPage="dashboard" adminRole={session?.role}>
      {!dashboardData.ok ? (
        <AdminPanel className="mb-4 shrink-0 border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          {dashboardData.message}
        </AdminPanel>
      ) : null}
      <MainDashboard bookings={dashboardData.bookings} drivers={dashboardData.drivers} />
    </AdminPageFrame>
  );
}
