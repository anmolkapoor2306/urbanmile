import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
    } = result.data;

    // Accept future Google Maps metadata now so the request contract can stay stable.
    const booking = await prisma.booking.create({
      data: {
        bookingType,
        fullName,
        email,
        phone,
        pickupLocation,
        dropoffLocation,
        pickupDateTime: new Date(pickupDateTime),
        carType,
        specialInstructions: specialInstructions || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Booking created successfully',
        data: {
          id: booking.id,
          bookingType: booking.bookingType,
          fullName: booking.fullName,
          email: booking.email,
          phone: booking.phone,
          pickupLocation: booking.pickupLocation,
          dropoffLocation: booking.dropoffLocation,
          pickupDateTime: booking.pickupDateTime.toISOString(),
          carType: booking.carType,
          specialInstructions: booking.specialInstructions,
          status: booking.status,
          createdAt: booking.createdAt.toISOString(),
          bookingReference: `UM-${booking.createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${booking.id.slice(0, 8)}`,
        },
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
