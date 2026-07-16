// Intuit sends the owner back here after consent. We verify the state cookie,
// swap the one-time code for tokens, and store the refresh token + company
// (realmId) server-side — the browser never sees them. Mirrors the Google
// callback. Then best-effort fetch the company name for the Settings label.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAppRole } from '@/lib/auth/role';
import { QBO, quickbooksConfigured, qboBasicAuth } from '@/lib/quickbooks/config';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const done = (flag: string) => {
    const res = NextResponse.redirect(new URL(`/settings?quickbooks=${flag}`, origin));
    res.cookies.delete('qbo_oauth_state');
    return res;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', origin));
  if ((await getAppRole(supabase)) !== 'owner') {
    return NextResponse.redirect(new URL('/my-work', origin));
  }
  if (!quickbooksConfigured()) return done('missing-env');

  const params = req.nextUrl.searchParams;
  if (params.get('error')) return done('denied'); // owner clicked Cancel at Intuit

  const state = params.get('state');
  const cookieState = req.cookies.get('qbo_oauth_state')?.value;
  const code = params.get('code');
  const realmId = params.get('realmId');
  if (!code || !realmId || !state || !cookieState || state !== cookieState) return done('failed');

  // Exchange the code for tokens (Basic auth with client id/secret).
  const tokenRes = await fetch(QBO.tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: qboBasicAuth(),
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${origin}/api/quickbooks/oauth/callback`,
    }),
  });
  if (!tokenRes.ok) return done('failed');

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!tokens.access_token || !tokens.refresh_token) return done('failed');

  const accessTokenExpiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();

  // Best-effort company name for the Settings label (non-fatal if it fails).
  let companyName: string | null = null;
  try {
    const infoRes = await fetch(
      `${QBO.apiBase}/${realmId}/companyinfo/${realmId}?minorversion=${QBO.minorVersion}`,
      { headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' } },
    );
    if (infoRes.ok) {
      const info = (await infoRes.json()) as { CompanyInfo?: { CompanyName?: string } };
      companyName = info.CompanyInfo?.CompanyName ?? null;
    }
  } catch {
    /* cosmetic — ignore */
  }

  const { error } = await supabase.from('qbo_accounts').upsert({
    user_id: user.id,
    realm_id: realmId,
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    access_token_expires_at: accessTokenExpiresAt,
    company_name: companyName,
    connected_at: new Date().toISOString(),
  });
  if (error) return done('failed');

  return done('connected');
}
