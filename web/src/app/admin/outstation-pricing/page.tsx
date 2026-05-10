import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { PricingEngineClient } from './PricingEngineClient';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  return (
    <AdminPageFrame currentPage="outstation-pricing">
      <PricingEngineClient />
    </AdminPageFrame>
  );
}
