import { redirect } from 'next/navigation';
import { AdminLogin } from '@/components/AdminLogin';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  if (await isCurrentAdminAuthenticated()) {
    redirect('/admin');
  }

  return <AdminLogin />;
}
