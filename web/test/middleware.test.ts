import { describe, it, expect } from 'vitest';
import { middleware } from '../middleware';
import { createSignedSession, SESSION_COOKIE_NAME, signSessionToken } from '../src/lib/sessionToken';

process.env.ADMIN_SESSION_SECRET = 'test-admin-session-secret-with-enough-entropy';

type MockRequest = {
  nextUrl: {
    pathname: string;
  };
  cookies: {
    get: (name: string) => { value: string } | undefined;
  };
};

const createMockRequest = (url: string, cookies: Record<string, string> = {}): Parameters<typeof middleware>[0] => {
  const request = {
    nextUrl: {
      pathname: new URL(url).pathname,
    },
    cookies: {
      get: (name: string) => {
        return cookies[name] ? { value: cookies[name] } : undefined;
      }
    }
  } satisfies MockRequest;

  return request as unknown as Parameters<typeof middleware>[0];
};

async function createSessionCookie() {
  return signSessionToken(createSignedSession({ userId: crypto.randomUUID(), role: 'OWNER' }));
}

describe('Admin Middleware Protection', () => {
  it('redirects logged-out users visiting /admin to /admin/login', async () => {
    const request = createMockRequest('http://localhost/admin');
    const response = await middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost/admin/login');
  });
  
  it('redirects logged-out users visiting /admin/ to /admin/login', async () => {
    const request = createMockRequest('http://localhost/admin/dashboard');
    const response = await middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost/admin/login');
  });
  
  it('allows logged-out users to access /admin/login', async () => {
    const request = createMockRequest('http://localhost/admin/login');
    const response = await middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
  
  it('allows authenticated users to access /admin', async () => {
    const request = createMockRequest('http://localhost/admin', { [SESSION_COOKIE_NAME]: await createSessionCookie() });
    const response = await middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
  
  it('allows authenticated users to access /admin/dashboard', async () => {
    const request = createMockRequest('http://localhost/admin/dashboard', { [SESSION_COOKIE_NAME]: await createSessionCookie() });
    const response = await middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
  
  it('redirects authenticated users from /admin/login to /admin', async () => {
    const request = createMockRequest('http://localhost/admin/login', { [SESSION_COOKIE_NAME]: await createSessionCookie() });
    const response = await middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost/admin');
  });
});
