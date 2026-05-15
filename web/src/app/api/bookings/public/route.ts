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
import { getCurrentCustomerSession } from '@/lib/customerAccountAuth';
import { z } from 'zod';
import {
  bookingLocationMetadataSchema,
  toPrismaBookingLocationSource,
} from '@/lib/bookingLocation';
import { isRouteServiceable } from '@/lib/operationalZones';
import { getPricingConfig } from '@/lib/pricingConfig';
import { PricingEngineError, calculateFare, normalizePricingRouteType, normalizePricingVehicleType } from '@/lib/pricingEngine';
import { readTripOverrides } from '@/lib/tripOverrideStore';
import { getTripOverrideVehiclePrice, matchTripOverride } from '@/lib/tripOverrides';

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
  fullName: z.string().optional(),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  phoneVerificationToken: z.string().optional(),
  dob: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']).optional(),
  authProvider: z.enum(['google', 'phone_guest']).default('phone_guest'),
  emailVerified: z.boolean().optional(),
  supabaseUserId: z.string().optional(),
  pickupLocation: z.string().min(1, 'Please enter pickup location'),
  dropoffLocation: z.string().min(1, 'Please enter drop location'),
  pickupDateTime: z.string().min(1, 'Please select pickup date and time'),
  returnPickupDateTime: z.string().optional(),
  bookingMode: z.enum(['ONE_WAY', 'ROUND_TRIP']).optional(),
  carType: z.enum(['SEDAN', 'SUV', 'VAN', 'LUXURY']).refine((val) => val === 'SEDAN', {
    message: 'Miles XL is coming soon. Please book Miles Eco for now.',
  }),
  fareAmount: z.number().positive().optional(),
  distanceKm: z.number().finite().positive().nullable().optional(),
  durationMinutes: z.number().finite().positive().nullable().optional(),
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
      distanceKm,
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

    const serviceability = await isRouteServiceable(prisma, {
      pickupLocation,
      pickupLatitude,
      pickupLongitude,
      dropoffLocation,
      dropoffLatitude,
      dropoffLongitude,
      carType,
      bookingMode,
    });

    if (!serviceability.ok) {
      return NextResponse.json(
        { success: false, error: serviceability.message, code: serviceability.code },
        { status: 400 }
      );
    }
    const manualConfirmationRequired = serviceability.confirmation === 'manual';

    const customerSession = await getCurrentCustomerSession();
    const loggedInCustomer = customerSession
      ? await prisma.customer.findUnique({
          where: { id: customerSession.customerId },
          select: {
            id: true,
            name: true,
            fullName: true,
            phone: true,
            email: true,
          },
        })
      : null;
    const isLoggedInCustomer = Boolean(loggedInCustomer);
    const bookingFullName = isLoggedInCustomer
      ? (loggedInCustomer?.fullName || loggedInCustomer?.name || '').trim()
      : (fullName || '').trim();
    const bookingPhone = isLoggedInCustomer
      ? loggedInCustomer?.phone || ''
      : phone || '';
    const bookingEmail = isLoggedInCustomer
      ? loggedInCustomer?.email || ''
      : email || '';

    const dobDate = dob ? new Date(`${dob}T00:00:00.000Z`) : null;
    const isFullProfileRequired = !isLoggedInCustomer && authProvider === 'google';
    if (!bookingFullName || !bookingPhone.trim() || (isFullProfileRequired && (!bookingEmail.trim() || !dobDate || Number.isNaN(dobDate.getTime()) || !gender))) {
      return NextResponse.json(
        { success: false, error: 'Customer details are incomplete' },
        { status: 400 }
      );
    }

    const oneWayDistanceKm =
      distanceKm ??
      getCoordinateDistanceKm(pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude);

    if (!oneWayDistanceKm || oneWayDistanceKm <= 0) {
      return NextResponse.json(
        { success: false, error: 'Unable to calculate fare for this trip.' },
        { status: 400 }
      );
    }

    const tripOverrides = await readTripOverrides();
    const overrideMatch = matchTripOverride(tripOverrides, pickupLocation, dropoffLocation);
    const overrideFare = overrideMatch ? getTripOverrideVehiclePrice(overrideMatch.override, carType) : null;
    const pricingSource = overrideFare !== null ? 'TRIP_OVERRIDE' as const : 'PRICING_ENGINE' as const;
    const pricingConfig = overrideFare === null ? await getPricingConfig() : null;
    const fare = pricingConfig
      ? calculateFare({
          vehicleType: normalizePricingVehicleType(carType),
          routeType: normalizePricingRouteType(bookingMode ?? 'ONE_WAY'),
          distanceKm: oneWayDistanceKm,
          config: pricingConfig,
        })
      : null;
    const totalFare = overrideFare ?? fare?.finalFare ?? null;

    if (totalFare === null) {
      return NextResponse.json(
        { success: false, error: 'Unable to calculate fare for this trip.' },
        { status: 400 }
      );
    }

    const calculatedLegPrice = isRoundTrip ? totalFare / 2 : totalFare;

    const bookings = await prisma.$transaction(async (tx) => {
      const normalizedPhone = normalizeCustomerPhone(bookingPhone);
      const ipAddress = getClientIp(request);
      const isAllowed = await assertRateLimit(tx, {
        action: 'booking_create',
        phone: normalizedPhone,
        ipAddress,
      });

      if (!isAllowed) {
        throw new PublicBookingError('BOOKING_RATE_LIMITED');
      }

      if (!isLoggedInCustomer && !phoneVerificationToken) {
        throw new PublicBookingError('PHONE_VERIFICATION_REQUIRED');
      }

      const isPhoneVerified = isLoggedInCustomer
        ? true
        : await verifyPhoneToken(tx, {
            phone: normalizedPhone,
            token: phoneVerificationToken || '',
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

      const customer = loggedInCustomer
        ? { id: loggedInCustomer.id }
        : await getOrCreateBookingCustomer(tx, {
            name: bookingFullName,
            phone: normalizedPhone,
            email: bookingEmail,
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
      const legPrice = calculatedLegPrice;
      const commonData = {
        bookingType,
        fullName: bookingFullName,
        email: bookingEmail,
        phone: normalizedPhone,
        customerId: customer.id,
        carType,
        fareAmount: legPrice,
        pricingSource,
        specialInstructions: specialInstructions || null,
        status: 'NEEDS_ASSIGNMENT' as const,
        confirmedAt: manualConfirmationRequired ? null : new Date(),
        internalNotes: manualConfirmationRequired ? 'Manual confirmation required by Service Control.' : null,
      };

      const buildLegacyData = ({
        id,
        bookingReference,
        publicBookingId,
        pickup,
        dropoff,
        pickupDateTime,
        pickupCoords,
        dropoffCoords,
      }: {
        id: string;
        bookingReference: string;
        publicBookingId: string;
        pickup: string;
        dropoff: string;
        pickupDateTime: Date;
        pickupCoords: LocationPersistenceData;
        dropoffCoords: LocationPersistenceData;
      }) => ({
        ...commonData,
        id,
        bookingReference,
        publicBookingId,
        roundTripGroupId: isRoundTrip ? basePublicBookingId : null,
        parentPublicBookingId: isRoundTrip ? basePublicBookingId : null,
        pickupLocation: pickup,
        pickupLatitude: pickupCoords.latitude,
        pickupLongitude: pickupCoords.longitude,
        pickupPlaceId: pickupCoords.placeId,
        pickupLocationSource: pickupCoords.source,
        dropoffLocation: dropoff,
        dropoffLatitude: dropoffCoords.latitude,
        dropoffLongitude: dropoffCoords.longitude,
        dropoffPlaceId: dropoffCoords.placeId,
        dropoffLocationSource: dropoffCoords.source,
        pickupDateTime,
      });

      const pickupCoords = {
        latitude: pickupLatitude ?? null,
        longitude: pickupLongitude ?? null,
        placeId: pickupPlaceId || null,
        source: toPrismaBookingLocationSource(pickupLocationSource),
      };
      const dropoffCoords = {
        latitude: dropoffLatitude ?? null,
        longitude: dropoffLongitude ?? null,
        placeId: dropoffPlaceId || null,
        source: toPrismaBookingLocationSource(dropoffLocationSource),
      };

      const bookingPlans = isRoundTrip
        ? [
            {
              id: crypto.randomUUID(),
              bookingReference: `${baseReference}-A`,
              publicBookingId: `${basePublicBookingId}-A`,
              pickup: pickupLocation,
              dropoff: dropoffLocation,
              pickupDateTime: pickupAt,
              pickupCoords,
              dropoffCoords,
            },
            {
              id: crypto.randomUUID(),
              bookingReference: `${baseReference}-B`,
              publicBookingId: `${basePublicBookingId}-B`,
              pickup: dropoffLocation,
              dropoff: pickupLocation,
              pickupDateTime: returnPickupAt as Date,
              pickupCoords: dropoffCoords,
              dropoffCoords: pickupCoords,
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
              pickupCoords,
              dropoffCoords,
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
    if (error instanceof PricingEngineError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

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

type LocationPersistenceData = {
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  source: ReturnType<typeof toPrismaBookingLocationSource>;
};

function getApiErrorResponse() {
  return {
    success: false,
    error: 'BOOKING_CREATE_FAILED',
  };
}

function getCoordinateDistanceKm(
  pickupLatitude: number | null | undefined,
  pickupLongitude: number | null | undefined,
  dropoffLatitude: number | null | undefined,
  dropoffLongitude: number | null | undefined
) {
  if (
    typeof pickupLatitude !== 'number' ||
    typeof pickupLongitude !== 'number' ||
    typeof dropoffLatitude !== 'number' ||
    typeof dropoffLongitude !== 'number'
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(dropoffLatitude - pickupLatitude);
  const longitudeDelta = toRadians(dropoffLongitude - pickupLongitude);
  const pickupLatRadians = toRadians(pickupLatitude);
  const dropoffLatRadians = toRadians(dropoffLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(pickupLatRadians) *
      Math.cos(dropoffLatRadians) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return Number((earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) * 1.25).toFixed(1));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
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
    phone: string | null;
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
