import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Customer, Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { normalizeCustomerPhone } from '@/lib/publicBookingIds';
import {
  CUSTOMER_SESSION_COOKIE_MAX_AGE,
  CUSTOMER_SESSION_COOKIE_NAME,
  createSignedCustomerSession,
  signCustomerSessionToken,
  verifyCustomerSessionToken,
  type CustomerSessionPayload,
} from '@/lib/customerSessionToken';

export const CUSTOMER_AUTH_GENDERS = ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'] as const;
export type CustomerAuthGender = (typeof CUSTOMER_AUTH_GENDERS)[number];

const LOGIN_LIMIT = 8;
const LOGIN_WINDOW_MINUTES = 15;

type CustomerCookieReader = {
  get(name: string): { value: string } | undefined;
};

const clearedCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  expires: new Date(0),
  maxAge: 0,
};

export function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export function normalizePhoneForAuth(phone: string | null | undefined) {
  if (!phone?.trim()) return null;
  const normalized = normalizeCustomerPhone(phone);
  return normalized.length >= 10 && normalized.length <= 15 ? normalized : null;
}

export function validatePasswordRules(password: string) {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Use at least 8 characters.');
  if (!/[A-Z]/.test(password)) errors.push('Add at least one uppercase letter.');
  if (!/[a-z]/.test(password)) errors.push('Add at least one lowercase letter.');
  if (!/\d/.test(password)) errors.push('Add at least one number.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Add at least one special character.');

  return errors;
}

export function isEmailIdentifier(identifier: string) {
  return identifier.includes('@');
}

export function normalizeLoginIdentifier(identifier: string) {
  const value = identifier.trim();
  if (!value) return null;

  if (isEmailIdentifier(value)) {
    return { type: 'email' as const, value: normalizeEmail(value) };
  }

  return { type: 'phone' as const, value: normalizePhoneForAuth(value) };
}

export async function findCustomerByIdentifier(identifier: string) {
  const normalized = normalizeLoginIdentifier(identifier);
  if (!normalized?.value) return null;

  return prisma.customer.findFirst({
    where:
      normalized.type === 'email'
        ? { email: normalized.value }
        : { phone: normalized.value },
  });
}

export async function createManualCustomer(input: {
  fullName: string;
  phone: string;
  email?: string | null;
  gender?: CustomerAuthGender | null;
  password: string;
}) {
  const fullName = input.fullName.trim();
  const phone = normalizePhoneForAuth(input.phone);
  const email = normalizeEmail(input.email);
  const passwordErrors = validatePasswordRules(input.password);

  if (fullName.length < 2) {
    return { ok: false as const, status: 400, error: 'Please enter your full name.' };
  }

  if (!phone) {
    return { ok: false as const, status: 400, error: 'Please enter a valid phone number.' };
  }

  if (passwordErrors.length > 0) {
    return { ok: false as const, status: 400, error: passwordErrors.join(' ') };
  }

  const duplicate = await prisma.customer.findFirst({
    where: {
      OR: [
        { phone },
        email ? { email } : undefined,
      ].filter(Boolean) as Prisma.CustomerWhereInput[],
    },
    select: { phone: true, email: true },
  });

  if (duplicate?.phone === phone) {
    return { ok: false as const, status: 409, error: 'That phone number is already registered. Please log in instead.' };
  }

  if (email && duplicate?.email === email) {
    return { ok: false as const, status: 409, error: 'That email is already registered. Please log in instead.' };
  }

  const passwordHash = await hashPassword(input.password);
  const { createCustomerPublicId } = await import('@/lib/publicBookingIds');

  const customer = await prisma.$transaction(async (tx) => tx.customer.create({
    data: {
      publicId: await createCustomerPublicId(tx),
      name: fullName,
      fullName,
      phone,
      email,
      gender: input.gender ?? null,
      passwordHash,
      authProvider: 'MANUAL',
      phoneVerified: false,
      emailVerified: false,
      role: 'CUSTOMER',
    },
  }));

  return { ok: true as const, customer };
}

export async function verifyCustomerCredentials(identifier: string, password: string) {
  const customer = await findCustomerByIdentifier(identifier);

  if (!customer?.passwordHash) {
    return null;
  }

  const match = await verifyPassword(password, customer.passwordHash);
  return match ? customer : null;
}

export async function createCustomerSession(customerId: string, request: NextRequest) {
  const dbSession = await prisma.customerSession.create({
    data: {
      customerId,
      token: crypto.randomUUID(),
      ipAddress: getClientIpFromRequest(request),
      userAgent: request.headers.get('user-agent') || null,
      expiresAt: new Date(Date.now() + CUSTOMER_SESSION_COOKIE_MAX_AGE * 1000),
    },
  });

  const session = createSignedCustomerSession({
    customerId,
    sessionId: dbSession.token,
  });
  const token = await signCustomerSessionToken(session);

  return { dbSession, token };
}

export async function parseCustomerSession(cookieStore: CustomerCookieReader): Promise<CustomerSessionPayload | null> {
  const sessionCookie = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME);
  if (!sessionCookie) return null;
  return verifyCustomerSessionToken(sessionCookie.value);
}

export async function getCurrentCustomerSession() {
  const cookieStore = await cookies();
  return validateCustomerSessionInDatabase(await parseCustomerSession(cookieStore));
}

export async function getCurrentCustomer() {
  const session = await getCurrentCustomerSession();
  if (!session) return null;

  return prisma.customer.findUnique({
    where: { id: session.customerId },
    select: customerSafeSelect,
  });
}

export async function requireCurrentCustomer() {
  const customer = await getCurrentCustomer();
  if (!customer) return null;
  return customer;
}

export async function validateCustomerSessionInDatabase(session: CustomerSessionPayload | null) {
  if (!session) return null;

  const dbSession = await prisma.customerSession.findFirst({
    where: {
      token: session.sessionId,
      customerId: session.customerId,
      expiresAt: { gt: new Date() },
    },
    select: { token: true, customerId: true },
  }).catch(() => null);

  return dbSession ? session : null;
}

export function setCustomerSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CUSTOMER_SESSION_COOKIE_MAX_AGE,
  });
}

export function clearCustomerSessionCookie(response: NextResponse) {
  response.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, '', clearedCookieOptions);
}

export async function deleteCustomerSession(token: string) {
  await prisma.customerSession.deleteMany({ where: { token } });
}

export async function assertCustomerLoginRateLimit(request: NextRequest, identifier?: string | null) {
  const ipAddress = getClientIpFromRequest(request);
  const normalized = identifier ? normalizeLoginIdentifier(identifier) : null;
  const since = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000);

  const attempts = await prisma.rateLimitEvent.count({
    where: {
      action: 'customer_login',
      createdAt: { gte: since },
      OR: [
        normalized?.type === 'phone' && normalized.value ? { phone: normalized.value } : undefined,
        ipAddress ? { ipAddress } : undefined,
      ].filter(Boolean) as Array<{ phone: string } | { ipAddress: string }>,
    },
  }).catch(() => 0);

  if (attempts >= LOGIN_LIMIT) return false;

  await prisma.rateLimitEvent.create({
    data: {
      action: 'customer_login',
      phone: normalized?.type === 'phone' ? normalized.value : null,
      ipAddress,
    },
  }).catch(() => {});

  return true;
}

export const customerSafeSelect = {
  id: true,
  publicId: true,
  name: true,
  fullName: true,
  phone: true,
  email: true,
  gender: true,
  authProvider: true,
  googleId: true,
  role: true,
  createdAt: true,
} satisfies Prisma.CustomerSelect;

export function serializeCustomer(customer: Pick<Customer, 'id' | 'publicId' | 'name' | 'fullName' | 'phone' | 'email' | 'gender' | 'authProvider' | 'role'>) {
  return {
    id: customer.id,
    publicId: customer.publicId,
    fullName: customer.fullName || customer.name,
    phone: customer.phone,
    email: customer.email,
    gender: customer.gender,
    authProvider: customer.authProvider,
    role: customer.role,
    profileComplete: Boolean(customer.phone),
  };
}

export function getClientIpFromRequest(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
