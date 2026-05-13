import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  assertCustomerLoginRateLimit,
  createCustomerSession,
  findCustomerByIdentifier,
  serializeCustomer,
  setCustomerSessionCookie,
  verifyCustomerCredentials,
} from '@/lib/customerAccountAuth';

const loginSchema = z.object({
  identifier: z.string().trim().min(3),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Enter your email or phone number and password.' }, { status: 400 });
    }

    const { identifier, password } = parsed.data;
    const allowed = await assertCustomerLoginRateLimit(request, identifier);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please wait a few minutes and try again.' },
        { status: 429 },
      );
    }

    const existing = await findCustomerByIdentifier(identifier);
    if (!existing) {
      return NextResponse.json(
        { success: false, code: 'CUSTOMER_NOT_FOUND', error: 'We could not find an account with those details.' },
        { status: 404 },
      );
    }

    if (!existing.passwordHash) {
      return NextResponse.json(
        { success: false, error: 'This account uses Google sign-in. Please continue with Google.' },
        { status: 401 },
      );
    }

    const customer = await verifyCustomerCredentials(identifier, password);
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'That password does not match this account.' },
        { status: 401 },
      );
    }

    const { token } = await createCustomerSession(customer.id, request);
    const response = NextResponse.json({
      success: true,
      customer: serializeCustomer(customer),
      redirectTo: '/',
    });
    setCustomerSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Customer login failed:', error);
    return NextResponse.json({ success: false, error: 'Login is unavailable right now. Please try again.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
