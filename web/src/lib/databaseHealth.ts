import { Socket } from 'node:net';

type DatabaseHealthResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

const DEFAULT_POSTGRES_PORT = 5432;
const DEFAULT_TIMEOUT_MS = 900;

export async function checkDatabaseTcpHealth(
  databaseUrl = process.env.DATABASE_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<DatabaseHealthResult> {
  if (!databaseUrl) {
    return { ok: false, reason: 'DATABASE_URL is not configured.' };
  }

  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    return { ok: false, reason: 'DATABASE_URL is not a valid URL.' };
  }

  const host = url.hostname;
  const port = Number(url.port || DEFAULT_POSTGRES_PORT);

  if (!host || !Number.isInteger(port) || port <= 0) {
    return { ok: false, reason: 'DATABASE_URL host or port is invalid.' };
  }

  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;

    const finish = (result: DatabaseHealthResult) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ ok: true }));
    socket.once('timeout', () => finish({ ok: false, reason: 'Database TCP connection timed out.' }));
    socket.once('error', () => finish({ ok: false, reason: 'Database TCP connection failed.' }));
    try {
      socket.connect({ host, port });
    } catch {
      finish({ ok: false, reason: 'Database TCP connection failed.' });
    }
  });
}

export function getSanitizedDatabaseTarget(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) return 'DATABASE_URL';

  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}:${url.port || DEFAULT_POSTGRES_PORT}`;
  } catch {
    return 'DATABASE_URL';
  }
}
