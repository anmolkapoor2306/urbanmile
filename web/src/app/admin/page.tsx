import { redirect } from 'next/navigation';
import { isCurrentAdminAuthenticated } from '@/lib/adminAuth';
import prisma from '@/lib/prisma';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';
import { driverRecordSelect, serializeDriver } from '@/lib/driverRecord';
import { AdminPageFrame } from '@/components/admin/AdminLayout';
import { MainDashboard } from '@/components/admin/MainDashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  if (!(await isCurrentAdminAuthenticated())) {
    redirect('/admin/login');
  }

  const [bookings, drivers] = await Promise.all([
    prisma.booking.findMany({
      select: bookingRecordSelect,
      orderBy: [{ pickupDateTime: 'asc' }],
      take: 1000,
    }),
    prisma.driver.findMany({
      select: driverRecordSelect,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    }),
  ]);

  return (
    <AdminPageFrame currentPage="dashboard">
      <MainDashboard bookings={bookings.map(serializeBooking)} drivers={drivers.map(serializeDriver)} />
    </AdminPageFrame>
  );
}
