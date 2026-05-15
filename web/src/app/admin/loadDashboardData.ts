import prisma from '@/lib/prisma';
import {
  bookingRecordSelect,
  serializeBooking,
  type SerializedBooking,
} from '@/lib/bookingRecord';
import {
  driverRecordSelect,
  serializeDriver,
  type SerializedDriver,
} from '@/lib/driverRecord';
import { checkDatabaseTcpHealth, getSanitizedDatabaseTarget } from '@/lib/databaseHealth';

const ADMIN_DASHBOARD_DATABASE_FAILURE_MESSAGE =
  'Admin data is temporarily unavailable. Database connection failed.';

type DashboardDataResult =
  | {
      ok: true;
      bookings: SerializedBooking[];
      drivers: SerializedDriver[];
      message: null;
    }
  | {
      ok: false;
      bookings: [];
      drivers: [];
      message: string;
    };

export async function loadAdminDashboardDataSafely(): Promise<DashboardDataResult> {
  const databaseHealth = await checkDatabaseTcpHealth();

  if (!databaseHealth.ok) {
    console.error(
      `Failed to load admin dashboard data: ${databaseHealth.reason} at ${getSanitizedDatabaseTarget()}`
    );
    return getUnavailableDashboardData();
  }

  const bookings = await loadDashboardBookingsSafely();
  const drivers = await loadDashboardDriversSafely();

  if (!bookings.ok || !drivers.ok) {
    return getUnavailableDashboardData();
  }

  return {
    ok: true,
    bookings: bookings.data,
    drivers: drivers.data,
    message: null,
  };
}

async function loadDashboardBookingsSafely() {
  try {
    const bookings = await prisma.booking.findMany({
      select: bookingRecordSelect,
      orderBy: [{ pickupDateTime: 'asc' }],
      take: 1000,
    });

    return {
      ok: true as const,
      data: bookings.map(serializeBooking),
    };
  } catch (error) {
    logDashboardDatabaseError('bookings', error);

    return {
      ok: false as const,
      data: [],
    };
  }
}

async function loadDashboardDriversSafely() {
  try {
    const drivers = await prisma.driver.findMany({
      select: driverRecordSelect,
      orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
    });

    return {
      ok: true as const,
      data: drivers.map(serializeDriver),
    };
  } catch (error) {
    logDashboardDatabaseError('drivers', error);

    return {
      ok: false as const,
      data: [],
    };
  }
}

function getUnavailableDashboardData(): DashboardDataResult {
  return {
    ok: false,
    bookings: [],
    drivers: [],
    message: ADMIN_DASHBOARD_DATABASE_FAILURE_MESSAGE,
  };
}

function logDashboardDatabaseError(scope: 'bookings' | 'drivers', error: unknown) {
  console.error(`Failed to load admin dashboard ${scope}:`, error);
}
