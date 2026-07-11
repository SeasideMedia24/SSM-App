// Google sends the user back here after the consent screen. We verify the
// state cookie, swap the one-time code for tokens, store the refresh token
// (server-side only — the browser never sees it), mirror the calendar list,
// and land on Settings with a status flag.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { googleConfigured, syncCalendarList } from '@/lib/google/calendar';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const done = (flag: string) => {
    const res = NextResponse.redirect(new URL(`/settings?google=${flag}`, origin));
    res.cookies.delete('g_oauth_state');
    return res;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', origin));
  if (!googleConfigured()) return done('missing-env');

  const params = req.nextUrl.searchParams;
  if (params.get('error')) return done('denied'); // user clicked Cancel at Google

  // CSRF check: the state Google echoes back must match our cookie.
  const state = params.get('state');
  const cookieState = req.cookies.get('g_oauth_state')?.value;
  const code = params.get('code');
  if (!code || !state || !cookieState || state !== cookieState) return done('failed');

  // Exchange the code for tokens.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${origin}/api/google/oauth/callback`,
    }),
  });
  if (!tokenRes.ok) return done('failed');

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    id_token?: string;
  };
  if (!tokens.access_token) return done('failed');

  // The connected account's email, from the id_token payload (JWT middle part).
  let email: string | null = null;
  try {
    const payload = tokens.id_token?.split('.')[1];
    if (payload) email = (JSON.parse(Buffer.from(payload, 'base64url').toString()) as { email?: string }).email ?? null;
  } catch {
    /* email is cosmetic — ignore a malformed id_token */
  }

  // prompt=consent means a refresh token normally arrives; if Google withheld
  // one anyway, keep the previously stored token rather than wiping it.
  const { data: existing } = await supabase.from('google_accounts').select('refresh_token').maybeSingle();
  const refreshToken = tokens.refresh_token ?? existing?.refresh_token;
  if (!refreshToken) return done('failed');

  const { error } = await supabase.from('google_accounts').upsert({
    user_id: user.id,
    email,
    refresh_token: refreshToken,
    access_token: tokens.access_token,
    access_token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    connected_at: new Date().toISOString(),
  });
  if (error) return done('failed');

  // Mirror the calendar list so Settings can offer include/exclude toggles.
  await syncCalendarList(supabase, user.id);

  return done('connected');
}
