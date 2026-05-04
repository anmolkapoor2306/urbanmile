import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPhoneVerificationToken, normalizePhoneToE164 } from '@/lib/customerAuth';
import { normalizeCustomerPhone } from '@/lib/publicBookingIds';
import { getTwilioVerifyClient, logTwilioError } from '@/lib/twilioVerify';

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(20),
  code: z.string().min(4).max(10),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = verifyOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Enter the verification code.' }, { status: 400 });
    }

    const phone = normalizePhoneToE164(result.data.phone);

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Enter a valid phone number.' }, { status: 400 });
    }

    const { client, verifyServiceSid } = getTwilioVerifyClient();
    const verification = await client.verify.v2.services(verifyServiceSid).verificationChecks.create({
      to: phone,
      code: result.data.code,
    });

    if (verification.status !== 'approved') {
      return NextResponse.json({ success: false, error: 'The verification code is not correct.' }, { status: 400 });
    }

    const normalizedBookingPhone = normalizeCustomerPhone(phone);

    return NextResponse.json({
      success: true,
      phone,
      bookingPhone: normalizedBookingPhone,
      phoneVerified: true,
      verificationToken: createPhoneVerificationToken(normalizedBookingPhone),
    });
  } catch (error) {
    logTwilioError('Twilio Verify check OTP failed', error);
    return NextResponse.json(
      { success: false, error: 'Could not verify the code. Please try again.' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
