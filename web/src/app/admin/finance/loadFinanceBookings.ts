import prisma from '@/lib/prisma';
import {
  bookingRecordSelect,
  serializeBooking,
  type SerializedBooking,
} from '@/lib/bookingRecord';
import { checkDatabaseTcpHealth, getSanitizedDatabaseTarget } from '@/lib/databaseHealth';

const FINANCE_DATABASE_FAILURE_MESSAGE = 'Finance data is temporarily unavailable. Database connection failed.';

export type FinanceBookingsResult =
  | {
      ok: true;
      bookings: SerializedBooking[];
    }
  | {
      ok: false;
      bookings: [];
      message: string;
    };

export async function loadFinanceBookingsSafely(): Promise<FinanceBookingsResult> {
  if (process.env.FINANCE_DB_ENABLED === 'false') {
    return getUnavailableFinanceBookings();
  }

  const databaseHealth = await checkDatabaseTcpHealth();

  if (!databaseHealth.ok) {
    console.warn(`Finance database unavailable at ${getSanitizedDatabaseTarget()}: ${databaseHealth.reason}`);
    return getUnavailableFinanceBookings();
  }

  try {
    const bookings = await prisma.booking.findMany({
      select: bookingRecordSelect,
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    return {
      ok: true,
      bookings: bookings.map(serializeBooking),
    };
  } catch (error) {
    logFinanceDatabaseError(error);

    return getUnavailableFinanceBookings();
  }
}

function getUnavailableFinanceBookings(): FinanceBookingsResult {
  return {
    ok: false,
    bookings: [],
    message: FINANCE_DATABASE_FAILURE_MESSAGE,
  };
}

function logFinanceDatabaseError(error: unknown) {
  const prismaError = getPrismaErrorDetails(error);

  if (prismaError.name === 'PrismaClientInitializationError') {
    console.warn(`Failed to load finance bookings: ${prismaError.name} at ${getSanitizedDatabaseTarget()}`);
    return;
  }

  if (prismaError.name === 'PrismaClientKnownRequestError') {
    console.warn(`Failed to load finance bookings: ${prismaError.name} code=${prismaError.code ?? 'unknown'} at ${getSanitizedDatabaseTarget()}`);
    return;
  }

  console.warn(`Failed to load finance bookings: ${prismaError.name} at ${getSanitizedDatabaseTarget()}`);
}

function getPrismaErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const maybePrismaError = error as Error & { code?: string };

    return {
      name: error.name,
      code: maybePrismaError.code,
    };
  }

  return {
    name: 'UnknownError',
    code: undefined,
  };
}
