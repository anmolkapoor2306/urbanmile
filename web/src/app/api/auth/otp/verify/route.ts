import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { normalizeCustomerPhone } from '@/lib/publicBookingIds';
import {
  compareOtpCode,
  createVerificationToken,
  minutesFromNow,
  verifiedTokenTtlMinutes,
} from '@/lib/customerAuth';

const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = verifyOtpSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: 'INVALID_OTP' }, { status: 400 });
    }

    const phone = normalizeCustomerPhone(result.data.phone);
    const verification = await prisma.customerOtpVerification.findFirst({
      where: {
        phone,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      return NextResponse.json({ success: false, error: 'OTP_EXPIRED' }, { status: 400 });
    }

    if (verification.attempts >= 5) {
      console.warn('UrbanMiles OTP verify attempts exceeded', { phone });
      return NextResponse.json({ success: false, error: 'OTP_LOCKED' }, { status: 429 });
    }

    const matches = compareOtpCode(phone, result.data.code, verification.codeHash);

    if (!matches) {
      await prisma.customerOtpVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });

      return NextResponse.json({ success: false, error: 'OTP_INVALID' }, { status: 400 });
    }

    const token = createVerificationToken();
    await prisma.customerOtpVerification.update({
      where: { id: verification.id },
      data: {
        token,
        verifiedAt: new Date(),
        expiresAt: minutesFromNow(verifiedTokenTtlMinutes),
      },
    });

    return NextResponse.json({
      success: true,
      phone,
      phoneVerified: true,
      verificationToken: token,
      expiresInSeconds: verifiedTokenTtlMinutes * 60,
    });
  } catch (error) {
    console.error('Error verifying booking OTP:', error);
    return NextResponse.json({ success: false, error: 'OTP_VERIFY_FAILED' }, { status: 500 });
  }
}
