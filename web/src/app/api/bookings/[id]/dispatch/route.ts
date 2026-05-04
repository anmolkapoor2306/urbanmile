import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { BOOKING_STATUSES, PAYMENT_STATUSES } from '@/lib/dispatch';
import { bookingRecordSelect, serializeBooking } from '@/lib/bookingRecord';

const moneyField = z.union([z.number().finite().min(0), z.null()]).optional();

const dispatchUpdateSchema = z.object({
  driverId: z.string().min(1).nullable().optional(),
  vendorId: z.string().min(1).nullable().optional(),
  vehicleId: z.string().min(1).nullable().optional(),
  carType: z.enum(['SEDAN', 'SUV', 'VAN', 'LUXURY']).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  fareAmount: moneyField,
  commissionAmount: moneyField,
  payoutAmount: moneyField,
  netEarningAmount: moneyField,
  manualVendorName: z.string().trim().max(120).nullable().optional(),
  manualDriverName: z.string().trim().max(120).nullable().optional(),
  manualDriverPhone: z.string().trim().max(30).nullable().optional(),
  manualVehicleDetails: z.string().trim().max(200).nullable().optional(),
  cancelReason: z.string().trim().max(200).nullable().optional(),
});

function serializeMoney(value: number | null | undefined) {
  return value === null || value === undefined ? null : value.toFixed(2);
}

function deriveFinancials({
  assignmentType,
  fareAmount,
  commissionAmount,
  payoutAmount,
  netEarningAmount,
}: {
  assignmentType?: 'OWN_DRIVER' | 'OUTSOURCED_DRIVER' | 'MANUAL_OUTSOURCED' | null;
  fareAmount?: number | null;
  commissionAmount?: number | null;
  payoutAmount?: number | null;
  netEarningAmount?: number | null;
}) {
  if (fareAmount === null || fareAmount === undefined) {
    return {
      commissionAmount: serializeMoney(commissionAmount),
      payoutAmount: serializeMoney(payoutAmount),
      netEarningAmount: serializeMoney(netEarningAmount),
      driverEarning: serializeMoney(payoutAmount),
    };
  }

  if (assignmentType === 'OWN_DRIVER') {
    const payout = payoutAmount ?? fareAmount;
    const commission = commissionAmount ?? 0;
    const net = netEarningAmount ?? Math.max(fareAmount - payout, 0);

    return {
      commissionAmount: serializeMoney(commission),
      payoutAmount: serializeMoney(payout),
      netEarningAmount: serializeMoney(net),
      driverEarning: serializeMoney(payout),
    };
  }

  const payout = payoutAmount ?? Math.max(fareAmount - (commissionAmount ?? 0), 0);
  const commission = commissionAmount ?? Math.max(fareAmount - payout, 0);
  const net = netEarningAmount ?? Math.max(fareAmount - payout, 0);

  return {
    commissionAmount: serializeMoney(commission),
    payoutAmount: serializeMoney(payout),
    netEarningAmount: serializeMoney(net),
    driverEarning: serializeMoney(payout),
  };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authError = requireAdminAuth(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const result = dispatchUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues.map((issue) => issue.message).join(', ') },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        driverId: true,
        vendorId: true,
        vehicleId: true,
        status: true,
        pickupDateTime: true,
        fareAmount: true,
        assignmentType: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    let assignmentType = booking.assignmentType;
    let assignedDriverId: string | null | undefined;

    if (result.data.driverId !== undefined) {
      if (result.data.driverId === null) {
        data.driverId = null;
        data.assignedAt = null;
        assignmentType = null;
      } else {
        const driver = await prisma.driver.findFirst({
          where: { id: result.data.driverId, isActive: true },
          select: { id: true, driverType: true, availabilityStatus: true },
        });

        if (!driver) {
          return NextResponse.json({ error: 'Only active drivers can be assigned' }, { status: 400 });
        }

        if (driver.availabilityStatus !== 'AVAILABLE' && driver.id !== booking.driverId) {
          return NextResponse.json({ error: 'This driver is not available for assignment' }, { status: 400 });
        }

        const pickupWindowStart = new Date(booking.pickupDateTime.getTime() - 4 * 60 * 60 * 1000);
        const pickupWindowEnd = new Date(booking.pickupDateTime.getTime() + 4 * 60 * 60 * 1000);
        const conflict = await prisma.booking.findFirst({
          where: {
            id: { not: booking.id },
            driverId: driver.id,
            status: { in: ['ASSIGNED', 'ACTIVE'] },
            pickupDateTime: {
              gte: pickupWindowStart,
              lte: pickupWindowEnd,
            },
          },
          select: { id: true, bookingReference: true },
        });

        if (conflict) {
          return NextResponse.json({ error: 'This driver already has a conflicting assigned or active trip' }, { status: 409 });
        }

        data.driverId = driver.id;
        data.assignedAt = new Date();
        assignmentType = driver.driverType === 'OWN' ? 'OWN_DRIVER' : 'OUTSOURCED_DRIVER';
        assignedDriverId = driver.id;
      }
    }

    if (result.data.vendorId !== undefined) {
      data.vendorId = result.data.vendorId;
    }

    if (result.data.vehicleId !== undefined) {
      data.vehicleId = result.data.vehicleId;
    }

    if (result.data.carType !== undefined) {
      data.carType = result.data.carType;
    }

    if (result.data.manualVendorName !== undefined) {
      data.manualVendorName = result.data.manualVendorName || null;
    }

    if (result.data.manualDriverName !== undefined) {
      data.manualDriverName = result.data.manualDriverName || null;
    }

    if (result.data.manualDriverPhone !== undefined) {
      data.manualDriverPhone = result.data.manualDriverPhone || null;
    }

    if (result.data.manualVehicleDetails !== undefined) {
      data.manualVehicleDetails = result.data.manualVehicleDetails || null;
    }

    const hasManualOutsourceDetails = Boolean(
      result.data.manualVendorName || result.data.manualDriverName || result.data.manualDriverPhone || result.data.manualVehicleDetails
    );

    if (!data.driverId && (result.data.vendorId || hasManualOutsourceDetails)) {
      assignmentType = hasManualOutsourceDetails ? 'MANUAL_OUTSOURCED' : 'OUTSOURCED_DRIVER';
      data.assignedAt = data.assignedAt ?? new Date();
    }

    if (assignmentType !== undefined) {
      data.assignmentType = assignmentType;
    }

    if (result.data.status) {
      data.status = result.data.status;
    } else if (assignmentType && booking.status !== 'ACTIVE' && booking.status !== 'COMPLETED') {
      data.status = 'ASSIGNED';
    }

    if (data.status === 'CONFIRMED') {
      data.confirmedAt = new Date();
    }

    if (data.status === 'ASSIGNED' && !booking.driverId && !data.driverId && !result.data.vendorId && !hasManualOutsourceDetails) {
      return NextResponse.json({ error: 'Assign a driver or vendor before marking as assigned' }, { status: 400 });
    }

    if (data.status === 'ACTIVE') {
      data.startedAt = new Date();
    }

    if (data.status === 'COMPLETED') {
      data.completedAt = new Date();
    }

    if (data.status === 'CANCELLED') {
      data.cancelledAt = new Date();
      data.cancelReason = result.data.cancelReason || null;
    }

    if (result.data.paymentStatus) {
      data.paymentStatus = result.data.paymentStatus;
      if (result.data.paymentStatus === 'PAID') {
        data.paymentReceivedAt = new Date();
      }
    }

    if (result.data.fareAmount !== undefined) {
      data.fareAmount = serializeMoney(result.data.fareAmount);
      if (result.data.fareAmount !== null && booking.status === 'NEW' && !result.data.status) {
        data.status = 'CONFIRMED';
        data.confirmedAt = new Date();
      }
    }

    const financials = deriveFinancials({
      assignmentType,
      fareAmount: result.data.fareAmount ?? (booking.fareAmount ? Number(booking.fareAmount) : null),
      commissionAmount: result.data.commissionAmount,
      payoutAmount: result.data.payoutAmount,
      netEarningAmount: result.data.netEarningAmount,
    });

    data.commissionAmount = financials.commissionAmount;
    data.payoutAmount = financials.payoutAmount;
    data.netEarningAmount = financials.netEarningAmount;
    data.driverEarning = financials.driverEarning;

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data,
        select: bookingRecordSelect,
      });

      const activeDriverId = assignedDriverId ?? updated.driverId ?? booking.driverId;

      if (assignedDriverId) {
        await tx.driver.update({
          where: { id: assignedDriverId },
          data: { availabilityStatus: 'BUSY' },
        });
      }

      if (booking.driverId && assignedDriverId && booking.driverId !== assignedDriverId) {
        await releaseDriverIfIdle(tx, booking.driverId);
      }

      if ((updated.status === 'COMPLETED' || updated.status === 'CANCELLED') && activeDriverId) {
        await releaseDriverIfIdle(tx, activeDriverId, updated.id);
      }

      if ((updated.status === 'ASSIGNED' || updated.status === 'ACTIVE') && activeDriverId) {
        await tx.driver.update({
          where: { id: activeDriverId },
          data: { availabilityStatus: 'BUSY' },
        });
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: serializeBooking(updatedBooking) });
  } catch (error) {
    console.error('Error updating dispatch booking:', error);
    return NextResponse.json({ error: 'Failed to update dispatch details' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

async function releaseDriverIfIdle(
  tx: Prisma.TransactionClient,
  driverId: string,
  excludeBookingId?: string
) {
  const remainingTrip = await tx.booking.findFirst({
    where: {
      driverId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      status: { in: ['ASSIGNED', 'ACTIVE'] },
    },
    select: { id: true },
  });

  if (!remainingTrip) {
    await tx.driver.update({
      where: { id: driverId },
      data: { availabilityStatus: 'AVAILABLE' },
    });
  }
}
