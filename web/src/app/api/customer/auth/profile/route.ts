import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  CUSTOMER_AUTH_GENDERS,
  getCurrentCustomerSession,
  normalizePhoneForAuth,
  serializeCustomer,
} from '@/lib/customerAccountAuth';

const profileSchema = z.object({
  phone: z.string().trim().min(10, 'Please enter a valid phone number.'),
  gender: z.enum(CUSTOMER_AUTH_GENDERS).nullable().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentCustomerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in again.' }, { status: 401 });
    }

    const parsed = profileSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Please enter a valid phone number.' }, { status: 400 });
    }

    const phone = normalizePhoneForAuth(parsed.data.phone);
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Please enter a valid phone number.' }, { status: 400 });
    }

    const duplicate = await prisma.customer.findFirst({
      where: {
        phone,
        NOT: { id: session.customerId },
      },
      select: { id: true },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, error: 'That phone number is already linked to another account.' },
        { status: 409 },
      );
    }

    const customer = await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        phone,
        gender: parsed.data.gender ?? undefined,
      },
    });

    return NextResponse.json({ success: true, customer: serializeCustomer(customer) });
  } catch (error) {
    console.error('Customer profile update failed:', error);
    return NextResponse.json({ success: false, error: 'We could not update your profile right now.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
