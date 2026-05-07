import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import prisma from '@/lib/prisma';
import { serializeOutstationRoute } from '@/lib/outstationPricing';
import { OutstationPricingClient } from './OutstationPricingClient';

export const dynamic = 'force-dynamic';

export default async function OutstationPricingPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  let routes: any[] = [];
  let databaseError: string | null = null;

  try {
    routes = await prisma.outstationRoute.findMany({
      orderBy: [{ isActive: 'desc' }, { originCity: 'asc' }, { destinationCity: 'asc' }],
    });
  } catch (error: any) {
    databaseError = error?.message || 'Could not load outstation routes';
    console.error('Failed to load outstation routes:', error);
  }

  return (
    <AdminPageFrame currentPage="outstation-pricing">
      <OutstationPricingClient
        initialRoutes={routes.map(serializeOutstationRoute)}
        databaseError={databaseError}
      />
    </AdminPageFrame>
  );
}
