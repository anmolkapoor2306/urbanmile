import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';

export const dynamic = 'force-dynamic';

const updateBookingDetailsSchema = z.object({
  fareAmount: z.number().finite().positive('Fare must be a valid positive number').optional(),
  pickupDateTime: z.string().min(1, 'Pickup date/time is required').optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const error = requireAdminAuth(request);
  if (error) return error;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = updateBookingDetailsSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 }
      );
    }

    const data: { fareAmount?: string; pickupDateTime?: Date } = {};

    if (result.data.fareAmount !== undefined) {
      data.fareAmount = result.data.fareAmount.toFixed(2);
    }

    if (result.data.pickupDateTime !== undefined) {
      const pickupDateTime = new Date(result.data.pickupDateTime);

      if (Number.isNaN(pickupDateTime.getTime())) {
        return NextResponse.json(
          { error: 'Pickup date/time is invalid' },
          { status: 400 }
        );
      }

      data.pickupDateTime = pickupDateTime;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No booking changes were submitted' },
        { status: 400 }
      );
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data,
      select: bookingRecordSelect,
    });

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      data: serializeBooking(updatedBooking),
    });
  } catch (error) {
    console.error('Error updating booking:', error);

    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const error = requireAdminAuth(request);
  if (error) return error;

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const deletedBooking = await prisma.booking.delete({
      where: { id },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully',
      data: {
        id: deletedBooking.id,
      },
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete booking' },
      { status: 500 }
    );
  }
}
