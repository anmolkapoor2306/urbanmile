import { Prisma } from '@prisma/client';

type BookingCustomerInput = {
  name: string;
  phone: string;
  email?: string | null;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  dob?: Date | string | null;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;
  authProvider?: 'GOOGLE' | 'PHONE_GUEST' | null;
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
      phone: string;
      email: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      INSERT INTO "Customer" ("publicId", "name", "phone", "email")
      VALUES (${publicId}, ${profileData.name}, ${phone}, ${profileData.email})
      RETURNING "id", "publicId", "name", "phone", "email", "createdAt", "updatedAt"
    `;

    return rows[0];
  }

  return tx.customer.create({
    data: {
      publicId: await createCustomerPublicId(tx),
      name: profileData.name,
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
  const nextValue = await nextCustomerSequenceValue(tx);
  return `CUS-${String(nextValue).padStart(4, '0')}`;
}

export async function createBasePublicBookingId(
  tx: Prisma.TransactionClient,
  pickupDateTime: Date
) {
  const nextValue = await nextBookingSequenceValue(tx);
  const year = pickupDateTime.getFullYear();
  return `UM-${year}-${String(nextValue).padStart(4, '0')}`;
}

async function nextCustomerSequenceValue(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ value: bigint }>>`
    SELECT nextval('customer_public_id_seq')::bigint AS value
  `;

  return Number(rows[0]?.value ?? 1);
}

async function nextBookingSequenceValue(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ value: bigint }>>`
    SELECT nextval('booking_public_id_seq')::bigint AS value
  `;

  return Number(rows[0]?.value ?? 1);
}
