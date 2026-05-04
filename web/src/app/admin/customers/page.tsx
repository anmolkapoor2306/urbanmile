import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { AdminPageFrame, AdminPanel } from '@/components/admin/AdminLayout';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const customers = await prisma.customer.findMany({
    include: {
      bookings: {
        select: {
          pickupDateTime: true,
          fareAmount: true,
        },
        orderBy: { pickupDateTime: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return (
    <AdminPageFrame currentPage="customers">
      <div className="flex flex-1 flex-col gap-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-white">Customers</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Guest customer IDs, contact details, booking counts, and spend.</p>
        </div>
        <AdminPanel className="p-5">
          {customers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              Customers will appear here after the first public-ID booking is created.
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => {
                const latestBooking = customer.bookings[0];
                const totalSpent = customer.bookings.reduce((total, booking) => total + Number(booking.fareAmount ?? 0), 0);
                return (
                  <div key={customer.id} className="grid gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-6">
                    <Info label="Customer ID" value={customer.publicId} />
                    <Info label="Name" value={customer.name} />
                    <Info label="Phone" value={customer.phone} />
                    <Info label="Email" value={customer.email || 'Not provided'} />
                    <Info label="Bookings" value={String(customer.bookings.length)} />
                    <Info label="Total Spent" value={formatMoney(totalSpent)} helper={latestBooking ? `Latest ${formatDate(latestBooking.pickupDateTime)}` : undefined} />
                  </div>
                );
              })}
            </div>
          )}
        </AdminPanel>
      </div>
    </AdminPageFrame>
  );
}

function Info({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 font-semibold text-zinc-950 dark:text-zinc-100">{value}</div>
      {helper ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{helper}</div> : null}
    </div>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: Date) {
  return value.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}
