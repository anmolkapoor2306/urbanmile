import { CarType, DriverAvailability, DriverType, PrismaClient } from '@prisma/client';
import { generateDriverCode } from '../src/lib/driverCode';

const prisma = new PrismaClient();
const SEED_MARKER = 'DEMO_TEST_DRIVER_SEED_V1';
const TARGET_DRIVER_COUNT = 30;

type DriverPlan = {
  index: number;
  name: string;
  phone: string;
  email: string;
  vehicleType: CarType;
  vehicleNumber: string;
  driverType: DriverType;
  availabilityStatus: DriverAvailability;
};

const driverNames = [
  'Gurpreet Singh',
  'Harpreet Gill',
  'Manpreet Sandhu',
  'Jaspreet Brar',
  'Ravinder Kumar',
  'Sukhwinder Singh',
  'Baljinder Singh',
  'Amandeep Kaur',
  'Parminder Singh',
  'Kuldeep Singh',
  'Satnam Singh',
  'Rajinder Pal',
  'Vikramjit Singh',
  'Navdeep Sharma',
  'Sandeep Kumar',
  'Harmanpreet Singh',
  'Davinder Singh',
  'Karanbir Singh',
  'Lovepreet Singh',
  'Amritpal Singh',
  'Mandeep Gill',
  'Tejinder Singh',
  'Rupinder Kaur',
  'Jagdeep Singh',
  'Varun Malhotra',
  'Nitin Batra',
  'Rakesh Kumar',
  'Deepak Arora',
  'Mohit Saini',
  'Surinder Singh',
];

function buildPlans(): DriverPlan[] {
  return driverNames.map((name, index) => {
    const suffix = String(index + 1).padStart(2, '0');
    const vehicleType = index % 3 === 0 ? CarType.SUV : CarType.SEDAN;

    return {
      index,
      name,
      phone: `91111${String(30000 + index).slice(-5)}`,
      email: `urbanmile.driver.${suffix}@example.com`,
      vehicleType,
      vehicleNumber: `PB08-DEMO-${suffix}`,
      driverType: index % 5 === 0 ? DriverType.THIRD_PARTY : DriverType.OWN,
      availabilityStatus: index >= 24 ? DriverAvailability.OFFLINE : DriverAvailability.AVAILABLE,
    };
  });
}

function noteForIndex(index: number) {
  return `${SEED_MARKER}:index=${String(index + 1).padStart(2, '0')}`;
}

async function main() {
  const existingSeedDrivers = await prisma.driver.findMany({
    where: {
      notes: {
        startsWith: SEED_MARKER,
      },
    },
    select: {
      notes: true,
      driverCode: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  if (existingSeedDrivers.length > TARGET_DRIVER_COUNT) {
    throw new Error(
      `Found ${existingSeedDrivers.length} ${SEED_MARKER} drivers. Refusing to add more because the seed set is already over ${TARGET_DRIVER_COUNT}.`
    );
  }

  const existingIndexes = new Set(
    existingSeedDrivers
      .map((driver) => driver.notes?.match(/index=(\d+)/)?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number(value) - 1)
  );
  const missingPlans = buildPlans().filter((plan) => !existingIndexes.has(plan.index));

  if (missingPlans.length === 0) {
    console.log(`No changes. ${TARGET_DRIVER_COUNT} ${SEED_MARKER} drivers already exist.`);
    return;
  }

  for (const plan of missingPlans) {
    await prisma.driver.create({
      data: {
        driverCode: await generateDriverCode(prisma, plan.driverType),
        name: plan.name,
        phone: plan.phone,
        email: plan.email,
        vehicleType: plan.vehicleType,
        vehicleNumber: plan.vehicleNumber,
        isActive: true,
        driverType: plan.driverType,
        availabilityStatus: plan.availabilityStatus,
        licenseInfo: `DL-PB08-DEMO-${String(plan.index + 1).padStart(4, '0')}`,
        notes: noteForIndex(plan.index),
      },
    });
  }

  const totalSeedDrivers = await prisma.driver.count({
    where: {
      notes: {
        startsWith: SEED_MARKER,
      },
    },
  });

  console.log(`Created ${missingPlans.length} drivers. ${totalSeedDrivers}/${TARGET_DRIVER_COUNT} ${SEED_MARKER} drivers now exist.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
