import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarClock, UserRound } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { CustomerLogoutButton } from '@/components/customer/CustomerLogoutButton';
import { getCurrentCustomerSession } from '@/lib/customerAccountAuth';
import { formatIndianPhoneDisplay } from '@/lib/customerDisplay';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CustomerDashboardPage() {
  const session = await getCurrentCustomerSession();
  if (!session) redirect('/login');

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    include: {
      bookings: {
        orderBy: { pickupDateTime: 'desc' },
        take: 5,
        select: {
          publicBookingId: true,
          pickupLocation: true,
          dropoffLocation: true,
          pickupDateTime: true,
          status: true,
        },
      },
    },
  });

  if (!customer) redirect('/login');
  if (!customer.phone) redirect('/login?completeProfile=1');

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <section className="mx-auto w-full max-w-5xl px-4 py-10 md:px-5">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-300">Customer dashboard</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Welcome, {customer.fullName || customer.name}
            </h1>
          </div>
          <CustomerLogoutButton />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-5 flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-amber-300" />
              <h2 className="text-xl font-black">My bookings</h2>
            </div>
            {customer.bookings.length === 0 ? (
              <div className="rounded-md border border-dashed border-zinc-700 p-5 text-sm font-semibold text-zinc-300">
                No bookings yet.
                <Link href="/#ride" className="ml-2 text-amber-300 hover:text-amber-200">Book your first ride</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.bookings.map((booking) => (
                  <article key={booking.publicBookingId} className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-white">{booking.pickupLocation}</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-400">to {booking.dropoffLocation}</p>
                      </div>
                      <span className="rounded-md bg-amber-300 px-2 py-1 text-xs font-black text-zinc-950">{booking.status}</span>
                    </div>
                    <p className="mt-3 text-xs font-semibold text-zinc-500">
                      {booking.publicBookingId} · {formatDate(booking.pickupDateTime)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
            <div className="mb-5 flex items-center gap-3">
              <UserRound className="h-5 w-5 text-amber-300" />
              <h2 className="text-xl font-black">Profile</h2>
            </div>
            <div className="space-y-4 text-sm">
              <ProfileRow label="Name" value={customer.fullName || customer.name} />
              <ProfileRow label="Phone" value={formatIndianPhoneDisplay(customer.phone)} />
              <ProfileRow label="Email" value={customer.email || 'Not provided'} />
              <ProfileRow label="Gender" value={formatGender(customer.gender)} />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-100">{value}</p>
    </div>
  );
}

function formatDate(value: Date) {
  return value.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatGender(value: string | null) {
  if (!value) return 'Not provided';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
