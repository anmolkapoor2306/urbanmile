import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const origin = request.nextUrl.origin;

  if (!supabaseUrl) {
    return NextResponse.json(
      {
        success: false,
        error: 'GOOGLE_AUTH_NOT_CONFIGURED',
      },
      { status: 503 }
    );
  }

  const redirectTo = `${origin}/?auth=google`;
  const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/authorize`);
  url.searchParams.set('provider', 'google');
  url.searchParams.set('redirect_to', redirectTo);

  return NextResponse.json({
    success: true,
    url: url.toString(),
  });
}
