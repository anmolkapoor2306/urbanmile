import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  createCustomerSession,
  normalizeEmail,
  setCustomerSessionCookie,
} from '@/lib/customerAccountAuth';
import { createCustomerPublicId } from '@/lib/publicBookingIds';

const GOOGLE_STATE_COOKIE = 'urbanmiles_google_oauth_state';

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleProfile = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
};

export async function GET(request: NextRequest) {
  const redirectBase = new URL('/login', request.url);

  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const expectedState = request.cookies.get(GOOGLE_STATE_COOKIE)?.value;

    logGoogleCallback('callback_received', {
      hasCode: Boolean(code),
      codeLength: code?.length ?? 0,
      hasState: Boolean(state),
      hasExpectedState: Boolean(expectedState),
      env: getEnvStatus(),
    });

    if (!code || !state || !expectedState || state !== expectedState) {
      logGoogleCallback('state_validation_failed', {
        hasCode: Boolean(code),
        hasState: Boolean(state),
        hasExpectedState: Boolean(expectedState),
        stateMatches: Boolean(state && expectedState && state === expectedState),
      });
      redirectBase.searchParams.set('error', 'google');
      return NextResponse.redirect(redirectBase);
    }

    const profile = await getGoogleProfile(request, code);
    const email = normalizeEmail(profile.email);
    const fullName = profile.name?.trim() || profile.given_name?.trim() || 'UrbanMiles Customer';

    const customer = await prisma.$transaction(async (tx) => {
      logGoogleCallback('database_lookup_started', {
        hasGoogleId: Boolean(profile.sub),
        hasEmail: Boolean(email),
      });

      const existing = await tx.customer.findFirst({
        where: {
          OR: [
            { googleId: profile.sub },
            email ? { email } : undefined,
          ].filter(Boolean) as Array<{ googleId: string } | { email: string }>,
        },
      });

      if (existing) {
        const updatedCustomer = await tx.customer.update({
          where: { id: existing.id },
          data: {
            googleId: existing.googleId || profile.sub,
            email: existing.email || email,
            emailVerified: existing.emailVerified || Boolean(profile.email_verified),
            authProvider: existing.authProvider || 'GOOGLE',
            fullName: existing.fullName || fullName,
            name: existing.name || fullName,
          },
        });

        logGoogleCallback('database_customer_result', {
          action: 'updated_existing',
          customerId: updatedCustomer.id,
          hasPhone: Boolean(updatedCustomer.phone),
        });
        return updatedCustomer;
      }

      const createdCustomer = await tx.customer.create({
        data: {
          publicId: await createCustomerPublicId(tx),
          name: fullName,
          fullName,
          phone: null,
          email,
          emailVerified: Boolean(profile.email_verified),
          googleId: profile.sub,
          authProvider: 'GOOGLE',
          role: 'CUSTOMER',
        },
      });

      logGoogleCallback('database_customer_result', {
        action: 'created_new',
        customerId: createdCustomer.id,
        hasPhone: Boolean(createdCustomer.phone),
      });
      return createdCustomer;
    });

    const { token } = await createCustomerSession(customer.id, request);
    logGoogleCallback('session_cookie_created', {
      customerId: customer.id,
      tokenLength: token.length,
      cookieWillBeSet: true,
    });

    const destination = new URL(customer.phone ? '/' : '/login', request.url);
    if (!customer.phone) destination.searchParams.set('completeProfile', '1');

    logGoogleCallback('redirecting_customer', {
      customerId: customer.id,
      destination: `${destination.pathname}${destination.search}`,
      needsProfileCompletion: !customer.phone,
    });

    const response = NextResponse.redirect(destination);
    response.cookies.set(GOOGLE_STATE_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0),
      maxAge: 0,
    });
    setCustomerSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Google customer login failed:', getSafeError(error));
    redirectBase.searchParams.set('error', 'google');
    return NextResponse.redirect(redirectBase);
  }
}

async function getGoogleProfile(request: NextRequest, code: string) {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${request.nextUrl.origin}/api/customer/auth/google/callback`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  logGoogleCallback('token_exchange_response', {
    status: tokenResponse.status,
    ok: tokenResponse.ok,
    redirectUriSource: process.env.GOOGLE_REDIRECT_URI ? 'env' : 'request_origin',
  });

  if (!tokenResponse.ok) {
    throw new Error('Google token exchange failed');
  }

  const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse;
  if (!tokenJson.access_token || tokenJson.error) {
    logGoogleCallback('token_exchange_incomplete', {
      hasAccessToken: Boolean(tokenJson.access_token),
      hasError: Boolean(tokenJson.error),
      error: tokenJson.error,
    });
    throw new Error('Google token response was incomplete');
  }

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });

  logGoogleCallback('userinfo_response', {
    status: profileResponse.status,
    ok: profileResponse.ok,
  });

  if (!profileResponse.ok) {
    throw new Error('Google profile lookup failed');
  }

  const profile = (await profileResponse.json()) as GoogleProfile;
  if (!profile.sub) {
    throw new Error('Google profile was missing an account id');
  }

  logGoogleCallback('userinfo_profile_loaded', {
    hasGoogleId: Boolean(profile.sub),
    hasEmail: Boolean(profile.email),
    emailVerified: Boolean(profile.email_verified),
    hasName: Boolean(profile.name || profile.given_name),
  });

  return profile;
}

function getEnvStatus() {
  return {
    GOOGLE_CLIENT_ID: Boolean(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    CUSTOMER_SESSION_SECRET: Boolean(process.env.CUSTOMER_SESSION_SECRET),
    NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
  };
}

function logGoogleCallback(event: string, details: Record<string, unknown>) {
  console.info('[Customer Google OAuth]', event, details);
}

function getSafeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return { message: 'Unknown error' };
}

export const dynamic = 'force-dynamic';
