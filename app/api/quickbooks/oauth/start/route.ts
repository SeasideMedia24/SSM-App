// Kick off the QuickBooks connection: send the owner to Intuit's consent screen
// (Accounting scope). A random state value is stored in an httpOnly cookie and
// checked on the way back (CSRF protection). Mirrors the Google OAuth start.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAppRole } from '@/lib/auth/role';
import { QBO, quickbooksConfigured } from '@/lib/quickbooks/config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', req.nextUrl.origin));
  // QuickBooks (the company's books) is the owner's connection alone.
  if ((await getAppRole(supabase)) !== 'owner') {
    return NextResponse.redirect(new URL('/my-work', req.nextUrl.origin));
  }
  if (!quickbooksConfigured()) {
    return NextResponse.redirect(new URL('/settings?quickbooks=missing-env', req.nextUrl.origin));
  }

  const state = crypto.randomUUID();
  const redirectUri = `${req.nextUrl.origin}/api/quickbooks/oauth/callback`;

  const consent = new URL(QBO.authorizeUrl);
  consent.searchParams.set('client_id', process.env.QUICKBOOKS_CLIENT_ID!);
  consent.searchParams.set('redirect_uri', redirectUri);
  consent.searchParams.set('response_type', 'code');
  consent.searchParams.set('scope', QBO.scope);
  consent.searchParams.set('state', state);

  const res = NextResponse.redirect(consent);
  res.cookies.set('qbo_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.nextUrl.protocol === 'https:',
    path: '/api/quickbooks/oauth',
    maxAge: 600,
  });
  return res;
}
