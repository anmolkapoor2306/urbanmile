import { describe, it, expect } from 'vitest';
import { middleware } from '../middleware';

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

describe('Admin Middleware Protection', () => {
  it('redirects logged-out users visiting /admin to /admin/login', () => {
    const request = createMockRequest('http://localhost/admin');
    const response = middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost/admin/login');
  });
  
  it('redirects logged-out users visiting /admin/ to /admin/login', () => {
    const request = createMockRequest('http://localhost/admin/dashboard');
    const response = middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost/admin/login');
  });
  
  it('allows logged-out users to access /admin/login', () => {
    const request = createMockRequest('http://localhost/admin/login');
    const response = middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
  
  it('allows authenticated users to access /admin', () => {
    const request = createMockRequest('http://localhost/admin', { admin_session: 'authenticated' });
    const response = middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
  
  it('allows authenticated users to access /admin/dashboard', () => {
    const request = createMockRequest('http://localhost/admin/dashboard', { admin_session: 'authenticated' });
    const response = middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
  
  it('redirects authenticated users from /admin/login to /admin', () => {
    const request = createMockRequest('http://localhost/admin/login', { admin_session: 'authenticated' });
    const response = middleware(request);
    
    expect(response).toBeDefined();
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('http://localhost/admin');
  });
});
