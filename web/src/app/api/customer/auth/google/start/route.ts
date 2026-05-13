import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_STATE_COOKIE = 'urbanmiles_google_oauth_state';

export async function POST(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { success: false, error: 'Google login is not configured yet.' },
      { status: 503 },
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = getGoogleRedirectUri(request);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');

  const response = NextResponse.json({ success: true, url: url.toString() });
  response.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  });
  return response;
}

function getGoogleRedirectUri(request: NextRequest) {
  return process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/customer/auth/google/callback`;
}

export const dynamic = 'force-dynamic';
