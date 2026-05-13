export const CUSTOMER_SESSION_COOKIE_NAME = 'urbanmiles_customer_session';
export const CUSTOMER_SESSION_COOKIE_MAX_AGE = 30 * 24 * 3600;

export interface CustomerSessionPayload {
  customerId: string;
  role: 'CUSTOMER';
  sessionId: string;
  exp: number;
}

export function createSignedCustomerSession(
  payload: Omit<CustomerSessionPayload, 'exp' | 'sessionId' | 'role'> & {
    sessionId?: string;
    role?: 'CUSTOMER';
  },
): CustomerSessionPayload {
  return {
    customerId: payload.customerId,
    role: payload.role ?? 'CUSTOMER',
    sessionId: payload.sessionId ?? crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + CUSTOMER_SESSION_COOKIE_MAX_AGE,
  };
}

export async function signCustomerSessionToken(session: CustomerSessionPayload): Promise<string> {
  const data = JSON.stringify(session);
  const sig = await hmacSign(data);
  return `${data}.${sig}`;
}

export async function verifyCustomerSessionToken(token: string): Promise<CustomerSessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  const dotIndex = token.lastIndexOf('.');
  if (dotIndex < 0) return null;

  const data = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (signature.length !== 64) return null;

  try {
    const parsed = JSON.parse(data) as CustomerSessionPayload;
    if (!parsed.customerId || parsed.role !== 'CUSTOMER' || !parsed.sessionId) return null;
    if (Math.floor(Date.now() / 1000) > parsed.exp) return null;

    return (await hmacVerify(data, signature)) ? parsed : null;
  } catch {
    return null;
  }
}

async function getKey(): Promise<CryptoKey> {
  const key =
    process.env.CUSTOMER_SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV === 'production' ? null : 'urbanmiles-customer-dev-secret');

  if (!key) throw new Error('CUSTOMER_SESSION_SECRET env variable is required');

  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function hmacSign(data: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return toHex(sig);
}

async function hmacVerify(data: string, signature: string): Promise<boolean> {
  const key = await getKey();
  return crypto.subtle.verify(
    'HMAC',
    key,
    hexToUint8(signature) as unknown as BufferSource,
    new TextEncoder().encode(data),
  );
}

function hexToUint8(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
