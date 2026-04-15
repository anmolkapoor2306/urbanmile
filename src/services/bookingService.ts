import prisma from '@/lib/prisma';
import { CreateBookingInput, UpdateBookingStatusInput } from '@/types';

export const createBooking = async (input: CreateBookingInput) => {
  try {
    const booking = await prisma.booking.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        pickupLocation: input.pickupLocation,
        dropoffLocation: input.dropoffLocation,
        pickupDateTime: input.pickupDateTime,
        carType: input.carType,
        specialInstructions: input.specialInstructions,
      },
    });
    return { success: true, data: booking };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to create booking' };
  }
};

export const getBookings = async (status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED', limit = 100) => {
  try {
    const bookings = await prisma.booking.findMany({
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
