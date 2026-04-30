import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createBookingReference } from '@/lib/bookingRecord';
import { z } from 'zod';
import { bookingLocationMetadataSchema } from '@/lib/bookingLocation';

const publicBookingSelect = {
  id: true,
  bookingReference: true,
  fullName: true,
  email: true,
  phone: true,
  pickupLocation: true,
  dropoffLocation: true,
  pickupDateTime: true,
  carType: true,
  fareAmount: true,
  specialInstructions: true,
  status: true,
} as const;

const bookingSchema = z.object({
  bookingType: z.enum(['PERSONAL', 'BUSINESS']),
  fullName: z.string().min(2, 'Please enter a valid name'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone: z.string().min(10, 'Please enter a valid phone number').max(15, 'Phone number too long'),
  pickupLocation: z.string().min(1, 'Please enter pickup location'),
  dropoffLocation: z.string().min(1, 'Please enter drop location'),
  pickupDateTime: z.string().min(1, 'Please select pickup date and time'),
  returnPickupDateTime: z.string().optional(),
  bookingMode: z.enum(['ONE_WAY', 'ROUND_TRIP']).optional(),
  carType: z.enum(['SEDAN', 'SUV', 'VAN', 'LUXURY']).refine((val) => val !== undefined, {
    message: 'Please select a vehicle type',
  }),
  fareAmount: z.number().positive().optional(),
  specialInstructions: z.string().optional(),
  pickupLatitude: bookingLocationMetadataSchema.shape.latitude,
  pickupLongitude: bookingLocationMetadataSchema.shape.longitude,
  pickupPlaceId: bookingLocationMetadataSchema.shape.placeId,
  pickupLocationSource: bookingLocationMetadataSchema.shape.source,
  dropoffLatitude: bookingLocationMetadataSchema.shape.latitude,
  dropoffLongitude: bookingLocationMetadataSchema.shape.longitude,
  dropoffPlaceId: bookingLocationMetadataSchema.shape.placeId,
  dropoffLocationSource: bookingLocationMetadataSchema.shape.source,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = bookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues.map(i => i.message).join(', ') },
        { status: 400 }
      );
    }

    const {
      bookingType,
      fullName,
      email,
      phone,
      pickupLocation,
      dropoffLocation,
      pickupDateTime,
      returnPickupDateTime,
      bookingMode,
      carType,
      fareAmount,
      specialInstructions,
      pickupLatitude,
      pickupLongitude,
      pickupPlaceId,
      pickupLocationSource,
      dropoffLatitude,
      dropoffLongitude,
      dropoffPlaceId,
      dropoffLocationSource,
    } = result.data;
    const pickupAt = new Date(pickupDateTime);
    const isRoundTrip = bookingMode === 'ROUND_TRIP';

    if (Number.isNaN(pickupAt.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid pickup date and time' },
        { status: 400 }
      );
    }

    const returnPickupAt = isRoundTrip ? new Date(returnPickupDateTime ?? '') : null;

    if (isRoundTrip && (!returnPickupAt || Number.isNaN(returnPickupAt.getTime()))) {
      return NextResponse.json(
        { success: false, error: 'Return date and time is required' },
        { status: 400 }
      );
    }

    if (isRoundTrip && returnPickupAt && returnPickupAt <= pickupAt) {
      return NextResponse.json(
        { success: false, error: 'Return date and time must be after pickup date and time' },
        { status: 400 }
      );
    }

    const baseId = crypto.randomUUID();
    const baseReference = createBookingReference(baseId, pickupAt);
    const legPrice = fareAmount ?? null;
    const commonData = {
      bookingType,
      fullName,
      email: email || '',
      phone,
      pickupLatitude: pickupLatitude ?? null,
      pickupLongitude: pickupLongitude ?? null,
      pickupPlaceId: pickupPlaceId || null,
      pickupLocationSource: pickupLocationSource ? pickupLocationSource.toUpperCase().replace('-', '_') as 'MANUAL' | 'CURRENT_LOCATION' : null,
      dropoffLatitude: dropoffLatitude ?? null,
      dropoffLongitude: dropoffLongitude ?? null,
      dropoffPlaceId: dropoffPlaceId || null,
      dropoffLocationSource: dropoffLocationSource ? dropoffLocationSource.toUpperCase().replace('-', '_') as 'MANUAL' | 'CURRENT_LOCATION' : null,
      carType,
      fareAmount: legPrice,
      specialInstructions: specialInstructions || null,
      status: 'NEW' as const,
    };

    const buildLegacyData = ({
      id,
      bookingReference,
      pickup,
      dropoff,
      pickupDateTime,
    }: {
      id: string;
      bookingReference: string;
      pickup: string;
      dropoff: string;
      pickupDateTime: Date;
    }) => ({
      ...commonData,
      id,
      bookingReference,
      pickupLocation: pickup,
      dropoffLocation: dropoff,
      pickupDateTime,
    });

    const bookingPlans = isRoundTrip
      ? [
          {
            id: crypto.randomUUID(),
            bookingReference: `${baseReference}-A`,
            pickup: pickupLocation,
            dropoff: dropoffLocation,
            pickupDateTime: pickupAt,
          },
          {
            id: crypto.randomUUID(),
            bookingReference: `${baseReference}-B`,
            pickup: dropoffLocation,
            dropoff: pickupLocation,
            pickupDateTime: returnPickupAt as Date,
          },
        ]
      : [
          {
            id: baseId,
            bookingReference: baseReference,
            pickup: pickupLocation,
            dropoff: dropoffLocation,
            pickupDateTime: pickupAt,
          },
        ];

    const bookings = await prisma.$transaction(
      bookingPlans.map((plan) =>
        prisma.booking.create({
          data: buildLegacyData(plan),
          select: publicBookingSelect,
        })
      )
    );

    const serializedBookings = bookings.map(serializePublicBooking);

    return NextResponse.json(
      {
        success: true,
        message: 'Booking created successfully',
        data: isRoundTrip ? serializedBookings : serializedBookings[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      getApiErrorResponse(),
      { status: 500 }
    );
  }
}

function getApiErrorResponse() {
  return {
    success: false,
    error: 'BOOKING_CREATE_FAILED',
  };
}

function serializePublicBooking(booking: {
  id: string;
  bookingReference: string;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDateTime: Date;
  carType: string;
  fareAmount: unknown;
  specialInstructions: string | null;
  status: string;
}) {
  return {
    ...booking,
    pickupDateTime: booking.pickupDateTime.toISOString(),
    fareAmount: booking.fareAmount === null ? null : Number(booking.fareAmount),
  };
}
