import type { PrismaClient } from '@prisma/client';

type DriverCodeDb = Pick<PrismaClient, 'driver'>;

function formatCode(value: number): string {
  return `DRV-${String(value).padStart(4, '0')}`;
}

export async function generateDriverCode(db: DriverCodeDb): Promise<string> {
  const nextSequence = await getNextDriverNumber(db);
  return formatCode(nextSequence);
}

export async function backfillDriverCodes(db: DriverCodeDb): Promise<{ updated: number }> {
  const drivers = await db.driver.findMany({
    where: { driverCode: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  let nextSequence = await getNextDriverNumber(db);
  let updated = 0;

  for (const driver of drivers) {
    await db.driver.updateMany({
      where: { id: driver.id, driverCode: null },
      data: { driverCode: formatCode(nextSequence) },
    });
    nextSequence += 1;
    updated += 1;
  }

  return { updated };
}

async function getNextDriverNumber(db: DriverCodeDb) {
  const existingCodes = await db.driver.findMany({ select: { driverCode: true } });
  return (
    existingCodes.reduce((max, { driverCode }) => {
      const match = driverCode?.match(/^DRV-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1
  );
}
