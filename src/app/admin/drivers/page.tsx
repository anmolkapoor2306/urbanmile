import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { driverRecordSelect, serializeDriver } from '@/lib/driverRecord';
import { DashboardHeader } from '@/components/admin/DashboardHeader';
import { DriverManagementTable } from '@/components/admin/DriverManagementTable';

export const dynamic = 'force-dynamic';

export default async function DriversPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const drivers = await prisma.driver.findMany({
    select: driverRecordSelect,
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });

  const serializedDrivers = drivers.map(serializeDriver);

  return (
    <div className="h-screen min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <DashboardHeader title="Driver Management" currentPage="drivers" />

      <main className="flex flex-1 min-h-0 overflow-hidden flex-col">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-8">
            {[
              ['Total Drivers', serializedDrivers.length],
              ['Available', serializedDrivers.filter((driver) => driver.availabilityStatus === 'AVAILABLE').length],
              ['Busy', serializedDrivers.filter((driver) => driver.availabilityStatus === 'BUSY').length],
              ['Vendors', serializedDrivers.filter((driver) => driver.driverType === 'VENDOR').length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">{label}</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</div>
              </div>
            ))}
          </div>

          <DriverManagementTable drivers={serializedDrivers} />
        </div>
      </main>
    </div>
  );
}
