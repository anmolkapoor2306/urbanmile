import prisma from '@/lib/prisma';
import { bookingRecordSelect, createBookingReference } from '@/lib/bookingRecord';
import { CreateBookingInput, UpdateBookingStatusInput } from '@/types';

export const createBooking = async (input: CreateBookingInput) => {
  try {
    const id = crypto.randomUUID();
    const booking = await prisma.booking.create({
      data: {
        id,
        bookingReference: createBookingReference(id, input.pickupDateTime),
        bookingType: input.bookingType,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        pickupLocation: input.pickupLocation,
        dropoffLocation: input.dropoffLocation,
        pickupDateTime: input.pickupDateTime,
        carType: input.carType,
        specialInstructions: input.specialInstructions ?? null,
        status: 'NEW',
      },
      select: bookingRecordSelect,
    });
    return { success: true, data: booking };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create booking' };
  }
};

export const getBookings = async (status?: 'NEW' | 'CONFIRMED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED', limit = 100) => {
  try {
    const bookings = await prisma.booking.findMany({
      select: bookingRecordSelect,
      take: limit,
      orderBy: { createdAt: 'desc' },
      ...(status ? { where: { status } } : {}),
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
