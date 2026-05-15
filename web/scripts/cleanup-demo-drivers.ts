import { DriverDutyStatus, DriverStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const OLD_SEED_MARKER = 'DEMO_TEST_DRIVER_SEED_V1';

async function main() {
  const demoDrivers = await prisma.driver.findMany({
    where: {
      notes: {
        startsWith: OLD_SEED_MARKER,
      },
    },
    select: {
      id: true,
      driverCode: true,
      fullName: true,
      name: true,
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  let deleted = 0;
  let archived = 0;

  for (const driver of demoDrivers) {
    if (driver._count.bookings > 0) {
      await prisma.driver.update({
        where: { id: driver.id },
        data: {
          status: DriverStatus.INACTIVE,
          dutyStatus: DriverDutyStatus.OFFLINE,
          isActive: false,
          availabilityStatus: 'OFFLINE',
          notes: `${driver.fullName || driver.name} archived from old demo seed. Booking history preserved.`,
        },
      });
      archived += 1;
      continue;
    }

    await prisma.driver.delete({ where: { id: driver.id } });
    deleted += 1;
  }

  console.log(`Old demo driver cleanup complete. Deleted: ${deleted}. Archived: ${archived}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
