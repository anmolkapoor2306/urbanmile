import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { normalizeCustomerPhone } from '@/lib/publicBookingIds';
import {
  assertRateLimit,
  createOtpCode,
  getClientIp,
  hashOtpCode,
  minutesFromNow,
  otpTtlMinutes,
} from '@/lib/customerAuth';

const requestOtpSchema = z.object({
  phone: z.string().min(10).max(15),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = requestOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: 'INVALID_PHONE' }, { status: 400 });
    }

    const phone = normalizeCustomerPhone(result.data.phone);
    const ipAddress = getClientIp(request);
    const code = createOtpCode();

    const allowed = await prisma.$transaction(async (tx) => {
      const isAllowed = await assertRateLimit(tx, {
        action: 'otp_request',
        phone,
        ipAddress,
      });

      if (!isAllowed) {
        return false;
      }

      await tx.customerOtpVerification.create({
        data: {
          phone,
          codeHash: hashOtpCode(phone, code),
          ipAddress,
          expiresAt: minutesFromNow(otpTtlMinutes),
        },
      });

      return true;
    });

    if (!allowed) {
      return NextResponse.json({ success: false, error: 'OTP_RATE_LIMITED' }, { status: 429 });
    }

    await sendOtpCode(phone, code);

    return NextResponse.json({
      success: true,
      message: 'OTP sent',
      expiresInSeconds: otpTtlMinutes * 60,
      devCode: process.env.NODE_ENV === 'production' ? undefined : code,
    });
  } catch (error) {
    console.error('Error requesting booking OTP:', error);
    return NextResponse.json({ success: false, error: 'OTP_REQUEST_FAILED' }, { status: 500 });
  }
}

async function sendOtpCode(phone: string, code: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('UrbanMiles OTP dev fallback active. Configure Supabase Auth env vars for SMS delivery.', {
      phone,
      code: process.env.NODE_ENV === 'production' ? '[hidden]' : code,
    });
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        phone: `+${phone}`,
        create_user: true,
      }),
    });

    if (!response.ok) {
      console.warn('Supabase OTP request failed; local OTP remains valid for this booking session.', {
        status: response.status,
      });
    }
  } catch (error) {
    console.warn('Supabase OTP request errored; local OTP remains valid for this booking session.', error);
  }
}
