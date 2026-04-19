import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';
import { DashboardHeader } from '@/components/admin/DashboardHeader';
import { MainDashboard } from '@/components/admin/MainDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const bookings = await prisma.booking.findMany({
    select: bookingRecordSelect,
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });

  return (
    <div className="h-screen min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 flex flex-col">
      <DashboardHeader title="Admin Dashboard" currentPage="dashboard" />

      <main className="flex flex-1 min-h-0 overflow-hidden flex-col">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 min-h-0 overflow-y-auto">
          <MainDashboard bookings={bookings.map(serializeBooking)} />
        </div>
      </main>
    </div>
  );
}
