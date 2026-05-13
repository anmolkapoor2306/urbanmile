import { randomUUID } from 'node:crypto';
import { PrismaClient, type BookingStatus, type CarType, type PaymentStatus } from '@prisma/client';
import { createBookingReference } from '../src/lib/bookingRecord';
import { getFixedRoutePrice } from '../src/lib/fixedRoutePricing';
import {
  createBasePublicBookingId,
  getOrCreateBookingCustomer,
  normalizeCustomerPhone,
} from '../src/lib/publicBookingIds';

const prisma = new PrismaClient();
const SEED_MARKER = 'TEST_SEED_FUTURE_BOOKINGS_V1';
const TARGET_BOOKING_COUNT = 50;

type RoutePlan = {
  pickupLocation: string;
  dropoffLocation: string;
  fallbackSedanFare: number;
};

type BookingPlan = RoutePlan & {
  index: number;
  fullName: string;
  email: string;
  phone: string;
  carType: CarType;
  pickupDateTime: Date;
  fareAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  manualDriverName?: string;
  manualDriverPhone?: string;
  manualVehicleDetails?: string;
};

const routes: RoutePlan[] = [
  { pickupLocation: 'Jalandhar', dropoffLocation: 'Amritsar', fallbackSedanFare: 2000 },
  { pickupLocation: 'Jalandhar', dropoffLocation: 'Ludhiana', fallbackSedanFare: 1800 },
  { pickupLocation: 'Jalandhar', dropoffLocation: 'Delhi City', fallbackSedanFare: 6300 },
  { pickupLocation: 'Amritsar', dropoffLocation: 'Jalandhar', fallbackSedanFare: 2000 },
  { pickupLocation: 'Ludhiana', dropoffLocation: 'Delhi', fallbackSedanFare: 5600 },
  { pickupLocation: 'Pathankot', dropoffLocation: 'Jammu', fallbackSedanFare: 3000 },
  { pickupLocation: 'Chandigarh', dropoffLocation: 'Jalandhar', fallbackSedanFare: 2500 },
];

const pickupTimes = [
  { hour: 6, minute: 30 },
  { hour: 9, minute: 15 },
  { hour: 13, minute: 0 },
  { hour: 16, minute: 45 },
  { hour: 19, minute: 30 },
  { hour: 22, minute: 15 },
  { hour: 1, minute: 0 },
  { hour: 3, minute: 30 },
];

const testNames = [
  'Aarav Sharma',
  'Meera Kapoor',
  'Kabir Singh',
  'Ananya Verma',
  'Rohan Mehta',
  'Simran Kaur',
  'Ishaan Bedi',
  'Naina Gill',
  'Arjun Malhotra',
  'Priya Sethi',
];

function buildPickupDateTime(index: number, now = new Date()) {
  const dayOffset = index % 22;
  const slot = pickupTimes[index % pickupTimes.length];
  const pickupAt = new Date(now);

  pickupAt.setHours(0, 0, 0, 0);
  pickupAt.setDate(pickupAt.getDate() + dayOffset);
  pickupAt.setHours(slot.hour, slot.minute, 0, 0);

  if (pickupAt <= now) {
    pickupAt.setDate(pickupAt.getDate() + 1);
  }

  return pickupAt;
}

function getFareAmount(route: RoutePlan, carType: CarType) {
  const fixedRoute = getFixedRoutePrice(route.pickupLocation, route.dropoffLocation);
  const sedanFare = fixedRoute?.sedanPrice ?? route.fallbackSedanFare;

  if (carType === 'SUV') {
    return Math.round(sedanFare * 1.35 / 50) * 50;
  }

  return sedanFare;
}

function buildPlans() {
  return Array.from({ length: TARGET_BOOKING_COUNT }, (_, index): BookingPlan => {
    const route = routes[index % routes.length];
    const carType: CarType = index % 3 === 0 ? 'SUV' : 'SEDAN';
    const status: BookingStatus = index >= 44 && index < 48 ? 'ASSIGNED' : index >= 48 ? 'ACTIVE' : 'NEEDS_ASSIGNMENT';
    const driverSuffix = String(index + 1).padStart(2, '0');

    return {
      ...route,
      index,
      fullName: testNames[index % testNames.length],
      email: `urbanmile.test.${String(index + 1).padStart(2, '0')}@example.com`,
      phone: `90000${String(50000 + index).slice(-5)}`,
      carType,
      pickupDateTime: buildPickupDateTime(index),
      fareAmount: getFareAmount(route, carType),
      status,
      paymentStatus: 'UNPAID',
      manualDriverName: status === 'NEEDS_ASSIGNMENT' ? undefined : `Test Driver ${driverSuffix}`,
      manualDriverPhone: status === 'NEEDS_ASSIGNMENT' ? undefined : `98888${String(70000 + index).slice(-5)}`,
      manualVehicleDetails: status === 'NEEDS_ASSIGNMENT' ? undefined : `${carType} TEST-${driverSuffix}`,
    };
  });
}

function noteForIndex(index: number) {
  return `${SEED_MARKER}:index=${String(index + 1).padStart(2, '0')}`;
}

async function main() {
  const existingSeedBookings = await prisma.booking.findMany({
    where: {
      internalNotes: {
        startsWith: SEED_MARKER,
      },
    },
    select: {
      internalNotes: true,
      publicBookingId: true,
    },
    orderBy: {
      pickupDateTime: 'asc',
    },
  });

  if (existingSeedBookings.length > TARGET_BOOKING_COUNT) {
    throw new Error(
      `Found ${existingSeedBookings.length} ${SEED_MARKER} bookings. Refusing to add more because the seed set is already over ${TARGET_BOOKING_COUNT}.`
    );
  }

  const existingIndexes = new Set(
    existingSeedBookings
      .map((booking) => booking.internalNotes?.match(/index=(\d+)/)?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number(value) - 1)
  );
  const missingPlans = buildPlans().filter((plan) => !existingIndexes.has(plan.index));

  if (missingPlans.length === 0) {
    console.log(`No changes. ${TARGET_BOOKING_COUNT} ${SEED_MARKER} bookings already exist.`);
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const plan of missingPlans) {
        const id = randomUUID();
        const customer = await getOrCreateBookingCustomer(tx, {
          name: plan.fullName,
          phone: plan.phone,
          email: plan.email,
          phoneVerified: true,
          emailVerified: false,
          authProvider: 'PHONE_GUEST',
        });
        const assignmentData =
          plan.status === 'NEEDS_ASSIGNMENT'
            ? {}
            : {
                assignmentType: 'MANUAL_OUTSOURCED' as const,
                assignedAt: new Date(),
                manualDriverName: plan.manualDriverName,
                manualDriverPhone: plan.manualDriverPhone,
                manualVehicleDetails: plan.manualVehicleDetails,
                startedAt: plan.status === 'ACTIVE' ? new Date() : null,
              };

        await tx.booking.create({
          data: {
            id,
            publicBookingId: await createBasePublicBookingId(tx, plan.pickupDateTime),
            bookingReference: createBookingReference(id, plan.pickupDateTime),
            bookingType: 'PERSONAL',
            fullName: plan.fullName,
            email: plan.email,
            phone: normalizeCustomerPhone(plan.phone),
            customerId: customer.id,
            pickupLocation: plan.pickupLocation,
            dropoffLocation: plan.dropoffLocation,
            pickupDateTime: plan.pickupDateTime,
            carType: plan.carType,
            fareAmount: plan.fareAmount,
            specialInstructions: 'Safe test booking seed data.',
            internalNotes: noteForIndex(plan.index),
            status: plan.status,
            paymentStatus: plan.paymentStatus,
            confirmedAt: new Date(),
            ...assignmentData,
          },
        });
      }
    },
    { timeout: 60000 }
  );

  const totalSeedBookings = await prisma.booking.count({
    where: {
      internalNotes: {
        startsWith: SEED_MARKER,
      },
    },
  });

  console.log(`Created ${missingPlans.length} bookings. ${totalSeedBookings}/${TARGET_BOOKING_COUNT} ${SEED_MARKER} bookings now exist.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
