import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { requireAdminAuth } from '@/lib/adminAuth';
import { BOOKING_STATUSES } from '@/lib/dispatch';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';

const statusUpdateSchema = z.object({
  status: z.enum(BOOKING_STATUSES),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const error = requireAdminAuth(request);
  if (error) return error;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = statusUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      );
    }

    const existingBooking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const statusTimestamps: Record<string, Date | null | undefined> = {};

    if (result.data.status === 'CONFIRMED') {
      statusTimestamps.confirmedAt = new Date();
    }

    if (result.data.status === 'IN_PROGRESS') {
      statusTimestamps.startedAt = new Date();
    }

    if (result.data.status === 'COMPLETED') {
      statusTimestamps.completedAt = new Date();
    }

    if (result.data.status === 'CANCELLED') {
      statusTimestamps.cancelledAt = new Date();
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        status: result.data.status,
        ...statusTimestamps,
      },
      select: bookingRecordSelect,
    });

    return NextResponse.json({
      success: true,
      message: 'Booking status updated successfully',
      data: serializeBooking(booking),
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json(
      { error: 'Failed to update booking status' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
