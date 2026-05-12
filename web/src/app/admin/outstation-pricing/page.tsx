import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated, getCurrentAdminSession } from '@/lib/adminAuth';
import { canAccessPage } from '@/lib/authPermissions';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { PricingEngineClient } from './PricingEngineClient';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const session = await getCurrentAdminSession();
  if (session && !canAccessPage(session.role, 'outstation-pricing')) redirect('/admin/forbidden');

  return (
    <AdminPageFrame currentPage="outstation-pricing" adminRole={session?.role}>
      <PricingEngineClient />
    </AdminPageFrame>
  );
}
