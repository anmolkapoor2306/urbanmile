import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/authPermissions';
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
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'bookings:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateBookingDetailsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map(issue => issue.message).join(', ') }, { status: 400 });
    }

    const data: { fareAmount?: string; pickupDateTime?: Date } = {};

    if (parsed.data.fareAmount !== undefined) {
      data.fareAmount = parsed.data.fareAmount.toFixed(2);
    }

    if (parsed.data.pickupDateTime !== undefined) {
      const pickupDateTime = new Date(parsed.data.pickupDateTime);

      if (Number.isNaN(pickupDateTime.getTime())) {
        return NextResponse.json({ error: 'Pickup date/time is invalid' }, { status: 400 });
      }

      data.pickupDateTime = pickupDateTime;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No booking changes were submitted' }, { status: 400 });
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
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request);
  if ('status' in auth) return auth;
  if (!hasPermission(auth.session.role, 'bookings:write')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const deletedBooking = await prisma.booking.delete({
      where: { id },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully',
      data: { id: deletedBooking.id },
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 });
  }
}