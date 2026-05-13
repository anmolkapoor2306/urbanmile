import { Prisma } from '@prisma/client';

type BookingCustomerInput = {
  name: string;
  phone: string;
  email?: string | null;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  dob?: Date | string | null;
  gender?: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
  authProvider?: 'GOOGLE' | 'MANUAL' | 'PHONE_GUEST' | null;
  supabaseUserId?: string | null;
};

export function normalizeCustomerPhone(phone: string) {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

export async function getOrCreateBookingCustomer(
  tx: Prisma.TransactionClient,
  input: BookingCustomerInput
) {
  const phone = normalizeCustomerPhone(input.phone);
  const profileData = {
    name: input.name,
    fullName: input.name,
    email: input.email || null,
    phoneVerified: input.phoneVerified ?? true,
    emailVerified: input.emailVerified ?? false,
    dob: input.dob ? new Date(input.dob) : null,
    gender: input.gender ?? null,
    authProvider: input.authProvider ?? 'PHONE_GUEST',
    supabaseUserId: input.supabaseUserId ?? null,
  };
  const hasCustomerAuthColumns = await customerAuthColumnsExist(tx);
  const existingCustomer = await tx.customer.findUnique({
    where: { phone },
    select: hasCustomerAuthColumns
      ? undefined
      : {
          id: true,
          publicId: true,
          name: true,
          fullName: true,
          phone: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
  });

  if (existingCustomer) {
    if (!hasCustomerAuthColumns) {
      if (existingCustomer.name === input.name && (existingCustomer.email || null) === profileData.email) {
        return existingCustomer;
      }

      return tx.customer.update({
        where: { id: existingCustomer.id },
        data: {
          name: profileData.name,
          fullName: profileData.fullName,
          email: existingCustomer.email || profileData.email,
        },
        select: {
          id: true,
          publicId: true,
          name: true,
          phone: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    const shouldUpdate =
      existingCustomer.name !== input.name ||
      existingCustomer.fullName !== input.name ||
      (!existingCustomer.email && Boolean(input.email)) ||
      !existingCustomer.phoneVerified ||
      !existingCustomer.dob ||
      !existingCustomer.gender ||
      !existingCustomer.authProvider ||
      (!existingCustomer.supabaseUserId && Boolean(input.supabaseUserId));

    if (!shouldUpdate) {
      return existingCustomer;
    }

    return tx.customer.update({
      where: { id: existingCustomer.id },
      data: {
        name: profileData.name,
        fullName: profileData.fullName,
        email: existingCustomer.email || profileData.email,
        phoneVerified: existingCustomer.phoneVerified || profileData.phoneVerified,
        emailVerified: existingCustomer.emailVerified || profileData.emailVerified,
        dob: existingCustomer.dob || profileData.dob,
        gender: existingCustomer.gender || profileData.gender,
        authProvider: existingCustomer.authProvider || profileData.authProvider,
        supabaseUserId: existingCustomer.supabaseUserId || profileData.supabaseUserId,
      },
    });
  }

  if (!hasCustomerAuthColumns) {
    const publicId = await createCustomerPublicId(tx);
    const rows = await tx.$queryRaw<Array<{
      id: string;
      publicId: string;
      name: string;
      fullName: string;
      phone: string;
      email: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      INSERT INTO "Customer" ("publicId", "name", "fullName", "phone", "email")
      VALUES (${publicId}, ${profileData.name}, ${profileData.fullName}, ${phone}, ${profileData.email})
      RETURNING "id", "publicId", "name", "fullName", "phone", "email", "createdAt", "updatedAt"
    `;

    return rows[0];
  }

  return tx.customer.create({
    data: {
      publicId: await createCustomerPublicId(tx),
      name: profileData.name,
      fullName: profileData.fullName,
      phone,
      email: profileData.email,
      phoneVerified: profileData.phoneVerified,
      emailVerified: profileData.emailVerified,
      dob: profileData.dob,
      gender: profileData.gender,
      authProvider: profileData.authProvider,
      supabaseUserId: profileData.supabaseUserId,
    },
  });
}

async function customerAuthColumnsExist(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Customer'
        AND column_name = 'phoneVerified'
    ) AS exists
  `;

  return Boolean(rows[0]?.exists);
}

export async function createCustomerPublicId(tx: Prisma.TransactionClient) {
  try {
    const nextValue = await nextCustomerSequenceValue(tx);
    return `CUS-${String(nextValue).padStart(4, '0')}`;
  } catch (error) {
    console.warn('Customer public ID sequence unavailable; using timestamp fallback.', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return `CUS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
}

export async function createBasePublicBookingId(
  tx: Prisma.TransactionClient,
  pickupDateTime: Date
) {
  const year = pickupDateTime.getFullYear();
  try {
    const nextValue = await nextBookingSequenceValue(tx);
    return `UM-${year}-${String(nextValue).padStart(4, '0')}`;
  } catch (error) {
    console.warn('Booking public ID sequence unavailable; using timestamp fallback.', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return `UM-${year}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }
}

async function nextCustomerSequenceValue(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ value: bigint | null }>>`
    SELECT
      CASE
        WHEN to_regclass('public.customer_public_id_seq') IS NULL THEN NULL
        ELSE nextval('public.customer_public_id_seq'::text)::bigint
      END AS value
  `;

  if (rows[0]?.value === null || rows[0]?.value === undefined) {
    throw new Error('customer_public_id_seq is missing');
  }

  return Number(rows[0].value);
}

async function nextBookingSequenceValue(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ value: bigint | null }>>`
    SELECT
      CASE
        WHEN to_regclass('public.booking_public_id_seq') IS NULL THEN NULL
        ELSE nextval('public.booking_public_id_seq'::text)::bigint
      END AS value
  `;

  if (rows[0]?.value === null || rows[0]?.value === undefined) {
    throw new Error('booking_public_id_seq is missing');
  }

  return Number(rows[0].value);
}
