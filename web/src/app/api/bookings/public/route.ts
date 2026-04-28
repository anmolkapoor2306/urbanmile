import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { bookingRecordSelect, createBookingReference, serializeBooking } from '@/lib/bookingRecord';
import { z } from 'zod';
import { bookingLocationMetadataSchema } from '@/lib/bookingLocation';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = bookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map(i => i.message).join(', ') },
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
    } = result.data;
    const id = crypto.randomUUID();
    const pickupAt = new Date(pickupDateTime);

    const booking = await prisma.booking.create({
      data: {
        id,
        bookingReference: createBookingReference(id, pickupAt),
        bookingType,
        fullName,
        email,
        phone,
        pickupLocation,
        pickupLatitude: pickupLatitude ?? null,
        pickupLongitude: pickupLongitude ?? null,
        pickupPlaceId: pickupPlaceId || null,
        pickupLocationSource: pickupLocationSource ? pickupLocationSource.toUpperCase().replace('-', '_') as 'MANUAL' | 'CURRENT_LOCATION' : null,
        dropoffLocation,
        dropoffLatitude: dropoffLatitude ?? null,
        dropoffLongitude: dropoffLongitude ?? null,
        dropoffPlaceId: dropoffPlaceId || null,
        dropoffLocationSource: dropoffLocationSource ? dropoffLocationSource.toUpperCase().replace('-', '_') as 'MANUAL' | 'CURRENT_LOCATION' : null,
        pickupDateTime: pickupAt,
        carType,
        specialInstructions: specialInstructions || null,
        status: 'NEW',
      },
      select: bookingRecordSelect,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Booking created successfully',
        data: serializeBooking(booking),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
