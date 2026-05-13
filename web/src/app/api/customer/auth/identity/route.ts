import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findCustomerByIdentifier } from '@/lib/customerAccountAuth';

const identitySchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone number.'),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = identitySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Enter a valid email or phone number.' }, { status: 400 });
    }

    const customer = await findCustomerByIdentifier(parsed.data.identifier);
    return NextResponse.json({ success: true, exists: Boolean(customer) });
  } catch (error) {
    console.error('Customer identity check failed:', error);
    return NextResponse.json({ success: false, error: 'We could not check that account right now.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
