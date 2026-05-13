import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createCustomerSession,
  createManualCustomer,
  CUSTOMER_AUTH_GENDERS,
  serializeCustomer,
  setCustomerSessionCookie,
  validatePasswordRules,
} from '@/lib/customerAccountAuth';

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter your full name.'),
  phone: z.string().trim().min(10, 'Please enter a valid phone number.'),
  email: z.string().trim().optional().nullable(),
  gender: z.enum(CUSTOMER_AUTH_GENDERS).nullable().optional(),
  password: z.string(),
  confirmPassword: z.string(),
}).superRefine((value, ctx) => {
  const passwordErrors = validatePasswordRules(value.password);
  for (const error of passwordErrors) {
    ctx.addIssue({ code: 'custom', path: ['password'], message: error });
  }

  if (value.password !== value.confirmPassword) {
    ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords do not match.' });
  }
});

export async function POST(request: NextRequest) {
  try {
    const parsed = signupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Please check your signup details.' },
        { status: 400 },
      );
    }

    const result = await createManualCustomer({
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email,
      gender: parsed.data.gender ?? null,
      password: parsed.data.password,
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    const { token } = await createCustomerSession(result.customer.id, request);
    const response = NextResponse.json({
      success: true,
      customer: serializeCustomer(result.customer),
      redirectTo: '/',
    });
    setCustomerSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Customer signup failed:', error);
    return NextResponse.json({ success: false, error: 'Signup is unavailable right now. Please try again.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
