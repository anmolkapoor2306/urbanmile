import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { AdminPageFrame, AdminPanel } from '@/components/admin/AdminLayout';

export const dynamic = 'force-dynamic';

export default async function FleetPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const vehicles = await prisma.vehicle.findMany({
    include: {
      driver: { select: { name: true, driverCode: true } },
      vendor: { select: { name: true } },
    },
    orderBy: [{ status: 'asc' }, { plateNumber: 'asc' }],
  });

  return (
    <AdminPageFrame currentPage="fleet">
      <div className="flex flex-1 flex-col gap-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Fleet</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Vehicle type, plate, status, and assigned driver/vendor.</p>
        </div>
        <AdminPanel className="p-5">
          {vehicles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              Fleet management will track vehicles, insurance, service dates, and availability once vehicles are added.
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-5">
                  <Info label="Plate" value={vehicle.plateNumber} />
                  <Info label="Type" value={vehicle.vehicleType} />
                  <Info label="Model" value={vehicle.model} />
                  <Info label="Status" value={vehicle.status} />
                  <Info label="Assigned To" value={vehicle.driver ? `${vehicle.driver.driverCode || ''} ${vehicle.driver.name}`.trim() : vehicle.vendor?.name || 'Unassigned'} />
                </div>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminPageFrame>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 font-semibold text-zinc-950 dark:text-zinc-100">{value}</div>
    </div>
  );
}
