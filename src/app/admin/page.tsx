import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { MainDashboard } from '@/components/admin/MainDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const bookings = await prisma.booking.findMany({
    where: { archivedAt: null },
    select: bookingRecordSelect,
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });

  return (
    <AdminPageFrame currentPage="dashboard">
      <MainDashboard bookings={bookings.map(serializeBooking)} />
    </AdminPageFrame>
  );
}
