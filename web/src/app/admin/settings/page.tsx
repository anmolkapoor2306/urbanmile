import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  return (
    <AdminPageFrame currentPage="settings">
      <AdminEmptyState
        title="Settings"
        description="Settings will control business phone numbers, pricing toggles, driver rules, payment settings, and admin preferences when those controls are ready."
      />
    </AdminPageFrame>
  );
}
