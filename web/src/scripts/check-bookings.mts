import prisma from '@/lib/prisma';

async function countBookings() {
  const total = await prisma.booking.count();
  console.log(`Total bookings: ${total}`);
  
  const statuses = await prisma.booking.groupBy({
    by: ['status'],
    _count: true,
  });
  console.log('By status:', JSON.stringify(statuses, null, 2));

  const latest = await prisma.booking.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: { id: true, fullName: true, status: true, pickupDateTime: true, createdAt: true },
  });
  console.log('Latest:', JSON.stringify(latest, null, 2));
}

countBookings().catch(console.error).finally(() => process.exit(0));
