const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_COOKIE_MAX_AGE = 8 * 3600;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export interface AdminSessionPayload {
  userId: string;
  role: string;
  sessionId: string;
  exp: number;
}

function getSigningKey(): string | null {
  return process.env.ADMIN_SESSION_SECRET || null;
}

export function createSignedSession(payload: Omit<AdminSessionPayload, 'exp' | 'sessionId'>): AdminSessionPayload {
  const sessionId = crypto.randomUUID();
  const exp = Math.floor(Date.now() / 1000) + SESSION_COOKIE_MAX_AGE;
  const session: AdminSessionPayload = {
    userId: payload.userId,
    role: payload.role,
    sessionId,
    exp,
  };
  return session;
}

export async function signSessionToken(session: AdminSessionPayload): Promise<string> {
  const data = JSON.stringify(session);
  const sig = await hmacSign(data);
  return `${data}.${sig}`;
}

async function getKey(): Promise<CryptoKey> {
  const key = getSigningKey();
  if (!key) throw new Error('ADMIN_SESSION_SECRET env variable is required');
  return crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function hmacSign(data: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return toHex(sig);
}

async function hmacVerify(data: string, signature: string): Promise<boolean> {
  const key = await getKey();
  return crypto.subtle.verify('HMAC', key, hexToUint8(signature) as unknown as BufferSource, new TextEncoder().encode(data));
}

export async function verifySessionToken(token: string): Promise<AdminSessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  const dotIndex = token.lastIndexOf('.');
  if (dotIndex < 0) return null;

  const data = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);

  if (signature.length !== 64) return null;

  try {
    const parsed = JSON.parse(data) as AdminSessionPayload;
    if (!parsed.userId || !parsed.role || !parsed.sessionId) return null;
    if (Math.floor(Date.now() / 1000) > parsed.exp) return null;

    const ok = await hmacVerify(data, signature);
    return ok ? parsed : null;
  } catch {
    return null;
  }
}

function hexToUint8(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(bytes)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE, cookieOptions };
