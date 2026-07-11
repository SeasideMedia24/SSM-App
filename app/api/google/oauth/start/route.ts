// Kick off the Google Calendar connection: send the signed-in user to Google's
// consent screen. Read-only calendar scope. A random state value is stored in
// an httpOnly cookie and checked on the way back (CSRF protection).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { googleConfigured } from '@/lib/google/calendar';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.nextUrl.origin));

  if (!googleConfigured()) {
    // Clear pointer instead of a cryptic Google error page.
    return NextResponse.redirect(new URL('/settings?google=missing-env', req.nextUrl.origin));
  }

  const state = crypto.randomUUID();
  const redirectUri = `${req.nextUrl.origin}/api/google/oauth/callback`;

  const consent = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  consent.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
  consent.searchParams.set('redirect_uri', redirectUri);
  consent.searchParams.set('response_type', 'code');
  // openid+email lets Settings show WHICH Google account is connected.
  consent.searchParams.set('scope', 'openid email https://www.googleapis.com/auth/calendar.readonly');
  consent.searchParams.set('access_type', 'offline'); // we need a refresh token
  consent.searchParams.set('prompt', 'consent'); // always re-issue the refresh token
  consent.searchParams.set('state', state);

  const res = NextResponse.redirect(consent);
  res.cookies.set('g_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    path: '/api/google/oauth',
    maxAge: 600,
  });
  return res;
}
