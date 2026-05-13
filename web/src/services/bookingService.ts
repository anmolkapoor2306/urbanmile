import prisma from '@/lib/prisma';
import { bookingRecordSelect, createBookingReference } from '@/lib/bookingRecord';
import {
  createBasePublicBookingId,
  getOrCreateBookingCustomer,
  normalizeCustomerPhone,
} from '@/lib/publicBookingIds';
import { toPrismaBookingLocationSource } from '@/lib/bookingLocation';
import { assertOperationalZoneSupportsBooking } from '@/lib/operationalZones';
import { CreateBookingInput, UpdateBookingStatusInput } from '@/types';

export const createBooking = async (input: CreateBookingInput) => {
  try {
    const zoneCheck = await assertOperationalZoneSupportsBooking(prisma, {
      pickupLocation: input.pickupLocation,
      pickupLatitude: input.pickupLatitude,
      pickupLongitude: input.pickupLongitude,
      dropoffLocation: input.dropoffLocation,
      carType: input.carType,
      bookingMode: 'ONE_WAY',
    });

    if (!zoneCheck.ok) {
      return { success: false, error: zoneCheck.message };
    }

    const booking = await prisma.$transaction(async (tx) => {
      const id = crypto.randomUUID();
      const customer = await getOrCreateBookingCustomer(tx, {
        name: input.fullName,
        phone: input.phone,
        email: input.email,
      });

      return tx.booking.create({
        data: {
          id,
          publicBookingId: await createBasePublicBookingId(tx, input.pickupDateTime),
          bookingReference: createBookingReference(id, input.pickupDateTime),
          bookingType: input.bookingType,
          fullName: input.fullName,
          email: input.email,
          phone: normalizeCustomerPhone(input.phone),
          customerId: customer.id,
          pickupLocation: input.pickupLocation,
          pickupLatitude: input.pickupLatitude ?? null,
          pickupLongitude: input.pickupLongitude ?? null,
          pickupPlaceId: input.pickupPlaceId || null,
          pickupLocationSource: toPrismaBookingLocationSource(input.pickupLocationSource),
          dropoffLocation: input.dropoffLocation,
          dropoffLatitude: input.dropoffLatitude ?? null,
          dropoffLongitude: input.dropoffLongitude ?? null,
          dropoffPlaceId: input.dropoffPlaceId || null,
          dropoffLocationSource: toPrismaBookingLocationSource(input.dropoffLocationSource),
          pickupDateTime: input.pickupDateTime,
          carType: input.carType,
          fareAmount: input.fareAmount ?? null,
          specialInstructions: input.specialInstructions ?? null,
          status: 'NEEDS_ASSIGNMENT',
          confirmedAt: new Date(),
        },
        select: bookingRecordSelect,
      });
    });
    return { success: true, data: booking };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create booking' };
  }
};

export const getBookings = async (status?: 'NEEDS_ASSIGNMENT' | 'ASSIGNED' | 'ACTIVE' | 'COMPLETE' | 'CANCELLED', limit = 100) => {
  try {
    const bookings = await prisma.booking.findMany({
      select: bookingRecordSelect,
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: status ? { status } : { status: { notIn: ['COMPLETE', 'CANCELLED'] } },
    });
    return { success: true, data: bookings };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch bookings' };
  }
};

export const getBookingById = async (id: string) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: bookingRecordSelect,
    });
    if (!booking) {
      return { success: false, error: 'Booking not found' };
    }
    return { success: true, data: booking };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to fetch booking' };
  }
};

export const updateBookingStatus = async (input: UpdateBookingStatusInput) => {
  try {
    const booking = await prisma.booking.update({
      where: { id: input.id },
      data: { status: input.status },
      select: bookingRecordSelect,
    });
    return { success: true, data: booking };
  } catch (error) {
    if (error instanceof Error) {
      if ((error as { code?: string }).code === 'P2025') {
        return { success: false, error: 'Booking not found' };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update booking' };
  }
};
