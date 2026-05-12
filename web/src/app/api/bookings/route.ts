import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
import { BOOKING_STATUSES } from '@/lib/dispatch';
import { bookingRecordSelect, createBookingReference, serializeBooking } from '@/lib/bookingRecord';
import {
  createBasePublicBookingId,
  getOrCreateBookingCustomer,
  normalizeCustomerPhone,
} from '@/lib/publicBookingIds';
import { z } from 'zod';
import {
  bookingLocationMetadataSchema,
  toPrismaBookingLocationSource,
} from '@/lib/bookingLocation';

const bookingSchema = z.object({
  bookingType: z.enum(['PERSONAL', 'BUSINESS']),
  fullName: z.string().min(2, 'Please enter a valid name'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number').max(15, 'Phone number too long'),
  pickupLocation: z.string().min(1, 'Please enter pickup location'),
  dropoffLocation: z.string().min(1, 'Please enter drop location'),
  pickupDateTime: z.string().min(1, 'Please select pickup date and time'),
  carType: z.enum(['SEDAN', 'SUV', 'VAN', 'LUXURY']).refine((val) => val !== undefined, {
    message: 'Please select a vehicle type',
  }),
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

export async function GET(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'bookings:read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: Prisma.BookingWhereInput = status && BOOKING_STATUSES.includes(status as (typeof BOOKING_STATUSES)[number])
      ? { status: status as (typeof BOOKING_STATUSES)[number] }
      : { status: { notIn: ['COMPLETED', 'CANCELLED'] } };

    const bookings = await prisma.booking.findMany({
      where,
      select: bookingRecordSelect,
      take: limit,
      orderBy: { pickupDateTime: 'asc' },
    });

    return NextResponse.json(
      { success: true, data: bookings.map(serializeBooking) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'bookings:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = bookingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join(', ') }, { status: 400 });
    }

    const {
      bookingType,
      fullName,
      email,
      phone,
      pickupLocation,
      dropoffLocation,
      pickupDateTime,
      carType,
      specialInstructions,
      pickupLatitude,
      pickupLongitude,
      pickupPlaceId,
      pickupLocationSource,
      dropoffLatitude,
      dropoffLongitude,
      dropoffPlaceId,
      dropoffLocationSource,
    } = parsed.data;
    const pickupAt = new Date(pickupDateTime);

    const booking = await prisma.$transaction(async (tx) => {
      const id = crypto.randomUUID();
      const customer = await getOrCreateBookingCustomer(tx, { name: fullName, phone, email });

      return tx.booking.create({
        data: {
          id,
          publicBookingId: await createBasePublicBookingId(tx, pickupAt),
          bookingReference: createBookingReference(id, pickupAt),
          bookingType,
          fullName,
          email,
          phone: normalizeCustomerPhone(phone),
          customerId: customer.id,
          pickupLocation,
          pickupLatitude: pickupLatitude ?? null,
          pickupLongitude: pickupLongitude ?? null,
          pickupPlaceId: pickupPlaceId || null,
          pickupLocationSource: toPrismaBookingLocationSource(pickupLocationSource),
          dropoffLocation,
          dropoffLatitude: dropoffLatitude ?? null,
          dropoffLongitude: dropoffLongitude ?? null,
          dropoffPlaceId: dropoffPlaceId || null,
          dropoffLocationSource: toPrismaBookingLocationSource(dropoffLocationSource),
          pickupDateTime: pickupAt,
          carType,
          specialInstructions: specialInstructions || null,
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
        select: bookingRecordSelect,
      });
    });

    return NextResponse.json(
      { success: true, message: 'Booking created successfully', data: serializeBooking(booking) },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';