import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  getCurrentCustomerSession,
  normalizeEmail,
  normalizePhoneForAuth,
  serializeCustomer,
  validatePasswordRules,
} from '@/lib/customerAccountAuth';
import { hashPassword, verifyPassword } from '@/lib/password';

const accountSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.'),
  email: z.string().trim().optional().nullable(),
  phone: z.string().trim().min(10, 'Please enter a valid phone number.'),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).superRefine((value, ctx) => {
  const wantsPasswordChange = Boolean(value.newPassword || value.confirmPassword || value.currentPassword);
  if (!wantsPasswordChange) return;

  if (!value.newPassword) {
    ctx.addIssue({ code: 'custom', path: ['newPassword'], message: 'Enter a new password.' });
    return;
  }

  for (const error of validatePasswordRules(value.newPassword)) {
    ctx.addIssue({ code: 'custom', path: ['newPassword'], message: error });
  }

  if (value.newPassword !== value.confirmPassword) {
    ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match.' });
  }
});

export async function GET() {
  const session = await getCurrentCustomerSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Please log in again.' }, { status: 401 });
  }

  const customer = await prisma.customer.findUnique({
    where: { id: session.customerId },
    select: {
      id: true,
      publicId: true,
      name: true,
      fullName: true,
      phone: true,
      email: true,
      gender: true,
      authProvider: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!customer) {
    return NextResponse.json({ success: false, error: 'Please log in again.' }, { status: 401 });
  }

  return NextResponse.json({
    success: true,
    customer: serializeCustomer(customer),
    hasPassword: Boolean(customer.passwordHash),
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentCustomerSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Please log in again.' }, { status: 401 });
    }

    const parsed = accountSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Please check your account details.' },
        { status: 400 },
      );
    }

    const fullName = parsed.data.fullName.trim();
    const email = normalizeEmail(parsed.data.email);
    const phone = normalizePhoneForAuth(parsed.data.phone);

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Please enter a valid phone number.' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: session.customerId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Please log in again.' }, { status: 401 });
    }

    const duplicate = await prisma.customer.findFirst({
      where: {
        NOT: { id: session.customerId },
        OR: [
          { phone },
          email ? { email } : undefined,
        ].filter(Boolean) as Prisma.CustomerWhereInput[],
      },
      select: { phone: true, email: true },
    });

    if (duplicate?.phone === phone) {
      return NextResponse.json(
        { success: false, error: 'That phone number is already linked to another account.' },
        { status: 409 },
      );
    }

    if (email && duplicate?.email === email) {
      return NextResponse.json(
        { success: false, error: 'That email is already linked to another account.' },
        { status: 409 },
      );
    }

    const wantsPasswordChange = Boolean(parsed.data.newPassword || parsed.data.confirmPassword || parsed.data.currentPassword);
    let passwordHash: string | undefined;

    if (wantsPasswordChange) {
      if (customer.passwordHash) {
        if (!parsed.data.currentPassword) {
          return NextResponse.json(
            { success: false, error: 'Enter your current password before changing it.' },
            { status: 400 },
          );
        }

        const currentPasswordMatches = await verifyPassword(parsed.data.currentPassword, customer.passwordHash);
        if (!currentPasswordMatches) {
          return NextResponse.json(
            { success: false, error: 'Your current password is incorrect.' },
            { status: 401 },
          );
        }
      }

      if (!parsed.data.newPassword) {
        return NextResponse.json({ success: false, error: 'Enter a new password.' }, { status: 400 });
      }

      passwordHash = await hashPassword(parsed.data.newPassword);
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        name: fullName,
        fullName,
        email,
        phone,
        ...(passwordHash ? { passwordHash, authProvider: 'MANUAL' as const } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      customer: serializeCustomer(updatedCustomer),
      hasPassword: Boolean(updatedCustomer.passwordHash),
    });
  } catch (error) {
    console.error('Customer account update failed:', error);
    return NextResponse.json({ success: false, error: 'We could not update your account right now.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
