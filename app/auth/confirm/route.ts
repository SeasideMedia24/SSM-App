// Auth callback — where Supabase email links land (team login invites today;
// password resets or magic links if we add them later).
//
// Supports both link styles Supabase can send:
//   ?token_hash=…&type=invite   → verifyOtp
//   ?code=…                     → exchangeCodeForSession (PKCE)
// On success the visitor has a session; invited team members go to /welcome to
// set their password, everyone else goes to the app (the layouts route them
// onward by role).

import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;
  const supabase = await createClient();

  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  const code = params.get('code');

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL('/login?error=link', origin));
  }
  // Invites set a password next; other link types just enter the app.
  const next = type === 'invite' || !type ? '/welcome' : '/dashboard';
  return NextResponse.redirect(new URL(next, origin));
}
