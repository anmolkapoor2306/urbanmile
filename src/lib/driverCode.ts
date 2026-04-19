import type { PrismaClient } from '@prisma/client';
import { DriverType } from '@prisma/client';

type DriverCodeDb = Pick<PrismaClient, 'driver'>;

function formatCode(prefix: string, num: number): string {
  return `${prefix}-${String(num).padStart(4, '0')}`;
}

export async function generateDriverCode(
  db: DriverCodeDb,
  driverType: DriverType
): Promise<string> {
  const prefix =
    driverType === DriverType.THIRD_PARTY ? 'TDRV' : driverType === DriverType.VENDOR ? 'VNDR' : 'DRV';

  const last = await db.driver.findFirst({
    where: { driverType },
    orderBy: { driverCode: 'desc' },
    select: { driverCode: true },
  });

  if (last?.driverCode) {
    const suffix = parseInt(last.driverCode.split('-')[1], 10);
    return formatCode(prefix, suffix + 1);
  }

  return formatCode(prefix, 1);
}

export async function backfillDriverCodes(
  db: DriverCodeDb
): Promise<{ ownUpdated: number; thirdPartyUpdated: number; vendorUpdated: number }> {
  const drivers = await db.driver.findMany({
    where: { driverCode: null },
    select: { id: true, driverType: true },
  });

  const updated = {
    ownUpdated: 0,
    thirdPartyUpdated: 0,
    vendorUpdated: 0,
  };

  const own = drivers.filter((d) => d.driverType === DriverType.OWN);
  const thirdParty = drivers.filter((d) => d.driverType === DriverType.THIRD_PARTY);
  const vendors = drivers.filter((d) => d.driverType === DriverType.VENDOR);

  for (let i = 0; i < own.length; i++) {
    await db.driver.updateMany({
      where: { id: own[i].id },
      data: { driverCode: formatCode('DRV', i + 1) },
    });
    updated.ownUpdated++;
  }

  for (let i = 0; i < thirdParty.length; i++) {
    await db.driver.updateMany({
      where: { id: thirdParty[i].id },
      data: { driverCode: formatCode('TDRV', i + 1) },
    });
    updated.thirdPartyUpdated++;
  }

  for (let i = 0; i < vendors.length; i++) {
    await db.driver.updateMany({
      where: { id: vendors[i].id },
      data: { driverCode: formatCode('VNDR', i + 1) },
    });
    updated.vendorUpdated++;
  }

  return updated;
}
