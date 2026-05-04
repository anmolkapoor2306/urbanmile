import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizePhoneToE164 } from '@/lib/customerAuth';
import { getTwilioVerifyClient, logTwilioError } from '@/lib/twilioVerify';

const sendOtpSchema = z.object({
  phone: z.string().min(10).max(20),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = sendOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Enter a valid phone number.' }, { status: 400 });
    }

    const phone = normalizePhoneToE164(result.data.phone);

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Enter a valid phone number.' }, { status: 400 });
    }

    const { client, verifyServiceSid } = getTwilioVerifyClient();

    await client.verify.v2.services(verifyServiceSid).verifications.create({
      to: phone,
      channel: 'sms',
    });

    return NextResponse.json({
      success: true,
      message: 'Verification code sent.',
      phone,
    });
  } catch (error) {
    logTwilioError('Twilio Verify send OTP failed', error);
    return NextResponse.json(
      { success: false, error: 'Could not send the verification code. Please try again.' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
