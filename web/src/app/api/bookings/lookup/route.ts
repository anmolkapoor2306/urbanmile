import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizeCustomerPhone } from '@/lib/publicBookingIds';
import { z } from 'zod';

const lookupSchema = z.object({
  phone: z.string().min(10, 'Phone number is required'),
  bookingId: z.string().min(6, 'Booking ID is required'),
});

const lookupBookingSelect = {
  publicBookingId: true,
  fullName: true,
  phone: true,
  pickupLocation: true,
  dropoffLocation: true,
  pickupDateTime: true,
  carType: true,
  fareAmount: true,
  status: true,
  roundTripGroupId: true,
  parentPublicBookingId: true,
  customer: {
    select: {
      publicId: true,
      name: true,
      phone: true,
      email: true,
    },
  },
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = lookupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Please enter your phone number and booking ID.' },
        { status: 400 }
      );
    }

    const phone = normalizeCustomerPhone(result.data.phone);
    const phoneDigits = result.data.phone.replace(/\D/g, '');
    const phoneCandidates = Array.from(
      new Set([phone, phoneDigits, result.data.phone.trim()].filter(Boolean))
    );
    const publicBookingId = result.data.bookingId.trim().toUpperCase();

    const booking = await prisma.booking.findFirst({
      where: {
        publicBookingId,
        OR: [
          { customer: { phone: { in: phoneCandidates } } },
          { phone: { in: phoneCandidates } },
        ],
      },
      select: lookupBookingSelect,
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: "We couldn't find a booking with those details. Please check your phone number and booking ID.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        publicBookingId: booking.publicBookingId,
        bookingReference: booking.publicBookingId,
        customerPublicId: booking.customer?.publicId ?? null,
        customerName: booking.customer?.name ?? booking.fullName,
        customerPhone: booking.customer?.phone ?? booking.phone,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        pickupDateTime: booking.pickupDateTime.toISOString(),
        carType: booking.carType,
        fareAmount: booking.fareAmount === null ? null : Number(booking.fareAmount),
        status: booking.status,
        roundTripGroupId: booking.roundTripGroupId,
        parentPublicBookingId: booking.parentPublicBookingId,
      },
    });
  } catch (error) {
    console.error('Error looking up booking:', error);
    return NextResponse.json(
      { success: false, error: 'BOOKING_LOOKUP_FAILED' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
