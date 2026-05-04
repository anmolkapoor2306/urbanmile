import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { normalizeCustomerPhone } from '@/lib/publicBookingIds';

const OTP_TTL_MINUTES = 10;
const VERIFIED_TOKEN_TTL_MINUTES = 30;
const OTP_REQUEST_LIMIT = 5;
const BOOKING_CREATE_LIMIT = 8;
const RATE_WINDOW_MINUTES = 15;

export const CUSTOMER_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
export type CustomerGenderInput = (typeof CUSTOMER_GENDERS)[number];
export type CustomerAuthProviderInput = 'google' | 'phone_guest';

export function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export function normalizeGender(gender: CustomerGenderInput) {
  return gender.toUpperCase() as 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
}

export function normalizeAuthProvider(provider: CustomerAuthProviderInput) {
  return provider === 'google' ? 'GOOGLE' : 'PHONE_GUEST';
}

export function createOtpCode() {
  return String(randomInt(100000, 1000000));
}

export function hashOtpCode(phone: string, code: string) {
  return createHash('sha256')
    .update(`${normalizeCustomerPhone(phone)}:${code}:${process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'urbanmiles-dev'}`)
    .digest('hex');
}

export function compareOtpCode(phone: string, code: string, expectedHash: string) {
  const actualHash = hashOtpCode(phone, code);
  const actual = Buffer.from(actualHash);
  const expected = Buffer.from(expectedHash);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createVerificationToken() {
  return randomBytes(32).toString('hex');
}

export function normalizePhoneToE164(phone: string) {
  const trimmedPhone = phone.trim();

  if (trimmedPhone.startsWith('+')) {
    const digits = trimmedPhone.slice(1).replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
  }

  const digits = trimmedPhone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export function createPhoneVerificationToken(phone: string) {
  const normalizedPhone = normalizeCustomerPhone(phone);
  const expiresAt = Date.now() + VERIFIED_TOKEN_TTL_MINUTES * 60 * 1000;
  const signature = signPhoneVerificationToken(normalizedPhone, expiresAt);

  return `v1.${expiresAt}.${normalizedPhone}.${signature}`;
}

function isSignedPhoneVerificationTokenValid(phone: string, token: string) {
  const normalizedPhone = normalizeCustomerPhone(phone);
  const [version, expiresAtValue, tokenPhone, tokenSignature] = token.split('.');
  const expiresAt = Number(expiresAtValue);

  if (
    version !== 'v1' ||
    !expiresAt ||
    tokenPhone !== normalizedPhone ||
    expiresAt <= Date.now() ||
    !tokenSignature
  ) {
    return false;
  }

  const expectedSignature = signPhoneVerificationToken(normalizedPhone, expiresAt);
  const actual = Buffer.from(tokenSignature);
  const expected = Buffer.from(expectedSignature);

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function signPhoneVerificationToken(phone: string, expiresAt: number) {
  return createHmac('sha256', process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'urbanmiles-dev')
    .update(`${phone}:${expiresAt}`)
    .digest('hex');
}

export function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

export function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function assertRateLimit(
  tx: Prisma.TransactionClient,
  {
    action,
    phone,
    ipAddress,
    limit,
  }: {
    action: 'otp_request' | 'booking_create';
    phone?: string | null;
    ipAddress?: string | null;
    limit?: number;
  }
) {
  const normalizedPhone = phone ? normalizeCustomerPhone(phone) : null;
  const maxAttempts = limit ?? (action === 'otp_request' ? OTP_REQUEST_LIMIT : BOOKING_CREATE_LIMIT);
  const since = minutesAgo(RATE_WINDOW_MINUTES);

  if (!(await tableExists(tx, 'RateLimitEvent'))) {
    console.error('UrbanMiles rate limit table is missing; allowing request without rate-limit persistence.', {
      action,
      phone: normalizedPhone,
      ipAddress,
    });
    return true;
  }

  try {
    const attempts = await tx.rateLimitEvent.count({
      where: {
        action,
        createdAt: { gte: since },
        OR: [
          normalizedPhone ? { phone: normalizedPhone } : undefined,
          ipAddress ? { ipAddress } : undefined,
        ].filter(Boolean) as Array<{ phone: string } | { ipAddress: string }>,
      },
    });

    if (attempts >= maxAttempts) {
      console.warn(`UrbanMiles ${action} rate limit hit`, { phone: normalizedPhone, ipAddress });
      return false;
    }

    await tx.rateLimitEvent.create({
      data: {
        action,
        phone: normalizedPhone,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      console.error('UrbanMiles rate limit table is missing; allowing request without rate-limit persistence.', {
        action,
        phone: normalizedPhone,
        ipAddress,
      });
      return true;
    }

    throw error;
  }

  return true;
}

export async function hasFreshDuplicateBooking(
  tx: Prisma.TransactionClient,
  {
    phone,
    pickupLocation,
    dropoffLocation,
    pickupDateTime,
  }: {
    phone: string;
    pickupLocation: string;
    dropoffLocation: string;
    pickupDateTime: Date;
  }
) {
  const normalizedPhone = normalizeCustomerPhone(phone);
  const duplicate = await tx.booking.findFirst({
    where: {
      phone: normalizedPhone,
      pickupLocation,
      dropoffLocation,
      pickupDateTime,
      status: { in: ['CONFIRMED', 'ASSIGNED', 'ACTIVE'] },
      createdAt: { gte: minutesAgo(10) },
    },
    select: { publicBookingId: true },
  });

  if (duplicate) {
    console.warn('UrbanMiles duplicate booking attempt blocked', {
      phone: normalizedPhone,
      pickupLocation,
      dropoffLocation,
      pickupDateTime: pickupDateTime.toISOString(),
    });
  }

  return duplicate;
}

export async function verifyPhoneToken(
  tx: Prisma.TransactionClient,
  {
    phone,
    token,
  }: {
    phone: string;
    token: string;
  }
) {
  const normalizedPhone = normalizeCustomerPhone(phone);

  if (isSignedPhoneVerificationTokenValid(normalizedPhone, token)) {
    return true;
  }

  if (!(await tableExists(tx, 'CustomerOtpVerification'))) {
    console.error('UrbanMiles OTP verification table is missing; rejecting unsigned verification token.', {
      phone: normalizedPhone,
    });
    return false;
  }

  try {
    const verification = await tx.customerOtpVerification.findFirst({
      where: {
        phone: normalizedPhone,
        token,
        verifiedAt: { not: null },
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    return Boolean(verification);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      console.error('UrbanMiles OTP verification table is missing; rejecting unsigned verification token.', {
        phone: normalizedPhone,
      });
      return false;
    }

    throw error;
  }
}

export const otpTtlMinutes = OTP_TTL_MINUTES;
export const verifiedTokenTtlMinutes = VERIFIED_TOKEN_TTL_MINUTES;

async function tableExists(tx: Prisma.TransactionClient, tableName: string) {
  const rows = await tx.$queryRaw<Array<{ exists: string | null }>>`
    SELECT to_regclass(${`public."${tableName}"`})::text AS exists
  `;

  return Boolean(rows[0]?.exists);
}
