import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createBookingReference } from '@/lib/bookingRecord';
import {
  createBasePublicBookingId,
  getOrCreateBookingCustomer,
  normalizeCustomerPhone,
} from '@/lib/publicBookingIds';
import {
  assertRateLimit,
  getClientIp,
  hasFreshDuplicateBooking,
  normalizeAuthProvider,
  normalizeGender,
  verifyPhoneToken,
} from '@/lib/customerAuth';
import { z } from 'zod';
import { bookingLocationMetadataSchema } from '@/lib/bookingLocation';

const publicBookingSelect = {
  publicBookingId: true,
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

const bookingSchema = z.object({
  bookingType: z.enum(['PERSONAL', 'BUSINESS']),
  fullName: z.string().min(2, 'Please enter a valid name'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone: z.string().min(10, 'Please enter a valid phone number').max(15, 'Phone number too long'),
  phoneVerificationToken: z.string().optional(),
  dob: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  authProvider: z.enum(['google', 'phone_guest']).default('phone_guest'),
  emailVerified: z.boolean().optional(),
  supabaseUserId: z.string().optional(),
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
      phoneVerificationToken,
      dob,
      gender,
      authProvider,
      emailVerified,
      supabaseUserId,
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

    const dobDate = dob ? new Date(`${dob}T00:00:00.000Z`) : null;
    const isFullProfileRequired = authProvider === 'google';
    if (!fullName.trim() || !phone.trim() || (isFullProfileRequired && (!email?.trim() || !dobDate || Number.isNaN(dobDate.getTime()) || !gender))) {
      return NextResponse.json(
        { success: false, error: 'Customer details are incomplete' },
        { status: 400 }
      );
    }

    const bookings = await prisma.$transaction(async (tx) => {
      const normalizedPhone = normalizeCustomerPhone(phone);
      const ipAddress = getClientIp(request);
      const isAllowed = await assertRateLimit(tx, {
        action: 'booking_create',
        phone: normalizedPhone,
        ipAddress,
      });

      if (!isAllowed) {
        throw new PublicBookingError('BOOKING_RATE_LIMITED');
      }

      if (!phoneVerificationToken) {
        throw new PublicBookingError('PHONE_VERIFICATION_REQUIRED');
      }

      const isPhoneVerified = await verifyPhoneToken(tx, {
        phone: normalizedPhone,
        token: phoneVerificationToken,
      });

      if (!isPhoneVerified) {
        throw new PublicBookingError('PHONE_VERIFICATION_REQUIRED');
      }

      const duplicateBooking = await hasFreshDuplicateBooking(tx, {
        phone: normalizedPhone,
        pickupLocation,
        dropoffLocation,
        pickupDateTime: pickupAt,
      });

      if (duplicateBooking) {
        throw new PublicBookingError('DUPLICATE_ACTIVE_BOOKING');
      }

      const customer = await getOrCreateBookingCustomer(tx, {
        name: fullName,
        phone: normalizedPhone,
        email,
        phoneVerified: true,
        emailVerified: emailVerified ?? authProvider === 'google',
        dob: dobDate,
        gender: gender ? normalizeGender(gender) : null,
        authProvider: normalizeAuthProvider(authProvider),
        supabaseUserId: supabaseUserId || null,
      });
      const baseId = crypto.randomUUID();
      const baseReference = createBookingReference(baseId, pickupAt);
      const basePublicBookingId = await createBasePublicBookingId(tx, pickupAt);
      const legPrice = fareAmount ?? null;
      const commonData = {
        bookingType,
        fullName,
        email: email || '',
        phone: normalizedPhone,
        customerId: customer.id,
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
        status: 'CONFIRMED' as const,
        confirmedAt: new Date(),
      };

      const buildLegacyData = ({
        id,
        bookingReference,
        publicBookingId,
        pickup,
        dropoff,
        pickupDateTime,
      }: {
        id: string;
        bookingReference: string;
        publicBookingId: string;
        pickup: string;
        dropoff: string;
        pickupDateTime: Date;
      }) => ({
        ...commonData,
        id,
        bookingReference,
        publicBookingId,
        roundTripGroupId: isRoundTrip ? basePublicBookingId : null,
        parentPublicBookingId: isRoundTrip ? basePublicBookingId : null,
        pickupLocation: pickup,
        dropoffLocation: dropoff,
        pickupDateTime,
      });

      const bookingPlans = isRoundTrip
        ? [
            {
              id: crypto.randomUUID(),
              bookingReference: `${baseReference}-A`,
              publicBookingId: `${basePublicBookingId}-A`,
              pickup: pickupLocation,
              dropoff: dropoffLocation,
              pickupDateTime: pickupAt,
            },
            {
              id: crypto.randomUUID(),
              bookingReference: `${baseReference}-B`,
              publicBookingId: `${basePublicBookingId}-B`,
              pickup: dropoffLocation,
              dropoff: pickupLocation,
              pickupDateTime: returnPickupAt as Date,
            },
          ]
        : [
            {
              id: baseId,
              bookingReference: baseReference,
              publicBookingId: basePublicBookingId,
              pickup: pickupLocation,
              dropoff: dropoffLocation,
              pickupDateTime: pickupAt,
            },
          ];

      return Promise.all(
        bookingPlans.map((plan) =>
          tx.booking.create({
            data: buildLegacyData(plan),
            select: publicBookingSelect,
          })
        )
      );
    });

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
    if (error instanceof PublicBookingError) {
      const status = error.code === 'BOOKING_RATE_LIMITED' ? 429 : 400;
      return NextResponse.json(
        { success: false, error: error.code },
        { status }
      );
    }

    console.error('Error creating booking:', error);
    return NextResponse.json(
      getApiErrorResponse(),
      { status: 500 }
    );
  }
}

class PublicBookingError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

function getApiErrorResponse() {
  return {
    success: false,
    error: 'BOOKING_CREATE_FAILED',
  };
}

function serializePublicBooking(booking: {
  publicBookingId: string;
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
  roundTripGroupId: string | null;
  parentPublicBookingId: string | null;
  customer: {
    publicId: string;
    name: string;
    phone: string;
    email: string | null;
  } | null;
}) {
  return {
    publicBookingId: booking.publicBookingId,
    bookingReference: booking.publicBookingId,
    customerPublicId: booking.customer?.publicId ?? null,
    customerName: booking.customer?.name ?? booking.fullName,
    customerPhone: booking.customer?.phone ?? booking.phone,
    customerEmail: booking.customer?.email ?? booking.email,
    fullName: booking.customer?.name ?? booking.fullName,
    email: booking.customer?.email ?? booking.email,
    phone: booking.customer?.phone ?? booking.phone,
    pickupLocation: booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
    pickupDateTime: booking.pickupDateTime.toISOString(),
    carType: booking.carType,
    fareAmount: booking.fareAmount === null ? null : Number(booking.fareAmount),
    specialInstructions: booking.specialInstructions,
    status: booking.status,
    roundTripGroupId: booking.roundTripGroupId,
    parentPublicBookingId: booking.parentPublicBookingId,
  };
}
