import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

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
