import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const bookingSchema = z.object({
  bookingType: z.enum(['PERSONAL', 'BUSINESS']).optional(),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  dropoffLocation: z.string().min(1, 'Dropoff location is required'),
  pickupDateTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date'),
  carType: z.enum(['SEDAN', 'SUV', 'VAN', 'LUXURY']),
  specialInstructions: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = bookingSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const { bookingType, fullName, email, phone, pickupLocation, dropoffLocation, pickupDateTime, carType, specialInstructions } = result.data;

    const booking = await prisma.booking.create({
      data: {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: { status?: string } = {};
    if (status && ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
      where.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where: status ? { status: status as 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' } : {},
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: bookings.map((bookingRecord: {
        id: string;
        fullName: string;
        email: string;
        phone: string;
        pickupLocation: string;
        dropoffLocation: string;
        pickupDateTime: Date;
        carType: string;
        specialInstructions: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
      }) => ({
        id: bookingRecord.id,
        bookingType: 'PERSONAL',
        fullName: bookingRecord.fullName,
        email: bookingRecord.email,
        phone: bookingRecord.phone,
        pickupLocation: bookingRecord.pickupLocation,
        dropoffLocation: bookingRecord.dropoffLocation,
        pickupDateTime: bookingRecord.pickupDateTime.toISOString(),
        carType: bookingRecord.carType,
        specialInstructions: bookingRecord.specialInstructions,
        status: bookingRecord.status,
        createdAt: bookingRecord.createdAt.toISOString(),
        updatedAt: bookingRecord.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
