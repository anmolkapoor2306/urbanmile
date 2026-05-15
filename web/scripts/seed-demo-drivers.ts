import { CarType, DriverDutyStatus, DriverStatus, DriverType, PrismaClient } from '@prisma/client';
import { generateDriverCode } from '../src/lib/driverCode';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();
const DEMO_EMAIL = 'demo.driver@urbanmiles.local';
const DEMO_PHONE = '+91 99155 60404';

async function main() {
  const existing = await prisma.driver.findFirst({
    where: {
      OR: [{ email: DEMO_EMAIL }, { phone: DEMO_PHONE }],
    },
    select: {
      driverCode: true,
      fullName: true,
      email: true,
      phone: true,
    },
  });

  if (existing) {
    console.log(`Demo driver already exists: ${existing.driverCode ?? 'DRV-0000'} · ${existing.fullName || existing.email || existing.phone}`);
    return;
  }

  const passwordHash = await hashPassword('Driver@123');

  const driver = await prisma.driver.create({
    data: {
      driverCode: await generateDriverCode(prisma),
      fullName: 'UrbanMiles Demo Driver',
      name: 'UrbanMiles Demo Driver',
      email: DEMO_EMAIL,
      phone: DEMO_PHONE,
      passwordHash,
      status: DriverStatus.ACTIVE,
      dutyStatus: DriverDutyStatus.OFFLINE,
      isActive: true,
      driverType: DriverType.OWN_DRIVER,
      availabilityStatus: 'OFFLINE',
      vehicleType: CarType.SEDAN,
      vehicleNumber: 'PB08-DEMO-01',
      licenseInfo: 'DL-PB08-DEMO-0001',
      notes: 'Manual demo driver for admin testing. Remove when no longer needed.',
    },
    select: {
      driverCode: true,
      fullName: true,
      email: true,
      phone: true,
    },
  });

  console.log(`Created demo driver: ${driver.driverCode} · ${driver.fullName}`);
  console.log(`Login: ${driver.email} or ${driver.phone}`);
  console.log('Password: Driver@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
