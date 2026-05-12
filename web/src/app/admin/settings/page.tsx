import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated, getCurrentAdminSession } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'settings')) redirect('/admin/forbidden');

  return (
    <AdminPageFrame currentPage="settings" adminRole={session?.role}>
      <AdminEmptyState
        title="Settings"
        description="Settings will control business phone numbers, pricing toggles, driver rules, payment settings, and admin preferences when those controls are ready."
      />
    </AdminPageFrame>
  );
}
