// Server-ONLY QuickBooks Online client: token refresh + an authenticated fetch
// wrapper. Mirrors lib/google/calendar.ts's token handling, with one QB-specific
// rule — QuickBooks ROTATES the refresh token on every refresh, so we persist the
// new refresh_token each time (Google keeps the same one). Tokens never reach the
// browser; this is only imported by server routes/actions.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { QBO, quickbooksConfigured, qboBasicAuth } from './config';

type DB = SupabaseClient<Database>;
export type QboAccount = Database['public']['Tables']['qbo_accounts']['Row'];

export async function getQboAccount(supabase: DB): Promise<QboAccount | null> {
  const { data } = await supabase.from('qbo_accounts').select('*').maybeSingle();
  return data ?? null;
}

// A valid access token, refreshed (and persisted) when the cached one is missing
// or within 60s of expiry. Persists the rotated refresh_token too. Returns null
// when QuickBooks rejects the refresh (revoked / 100-day refresh token expired) —
// the owner then needs to reconnect in Settings.
async function accessTokenFor(supabase: DB, account: QboAccount): Promise<string | null> {
  const expiresAt = account.access_token_expires_at ? Date.parse(account.access_token_expires_at) : 0;
  if (account.access_token && expiresAt > Date.now() + 60_000) return account.access_token;

  const res = await fetch(QBO.tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: qboBasicAuth(),
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: account.refresh_token }),
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { access_token?: string; expires_in?: number; refresh_token?: string };
  if (!json.access_token) return null;

  await supabase
    .from('qbo_accounts')
    .update({
      access_token: json.access_token,
      access_token_expires_at: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
      // Persist the rotated refresh token so the next refresh works.
      refresh_token: json.refresh_token ?? account.refresh_token,
    })
    .eq('user_id', account.user_id);

  return json.access_token;
}

export type QboAuth =
  | { ok: true; token: string; account: QboAccount }
  | { ok: false; error: string };

const RECONNECT_HINT =
  'QuickBooks needs to be reconnected — open Settings → QuickBooks and click Connect, then try again.';

export async function qboAuth(supabase: DB): Promise<QboAuth> {
  if (!quickbooksConfigured()) {
    return { ok: false, error: 'QuickBooks isn’t configured on the server (missing QUICKBOOKS_CLIENT_ID/SECRET).' };
  }
  const account = await getQboAccount(supabase);
  if (!account) return { ok: false, error: 'QuickBooks isn’t connected yet — connect it in Settings.' };
  const token = await accessTokenFor(supabase, account);
  if (!token) return { ok: false, error: RECONNECT_HINT };
  return { ok: true, token, account };
}

// Authenticated call against the connected company. `path` starts with '/'
// (e.g. `/invoice`, `/query?query=...`). Returns parsed JSON; throws a friendly
// Error on failure so callers can surface it.
export async function qboFetch(
  supabase: DB,
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const auth = await qboAuth(supabase);
  if (!auth.ok) throw new Error(auth.error);

  const sep = path.includes('?') ? '&' : '?';
  const url = `${QBO.apiBase}/${auth.account.realm_id}${path}${sep}minorversion=${QBO.minorVersion}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  if (!res.ok) {
    // QuickBooks returns a Fault object with a readable message.
    let message = `QuickBooks error (${res.status}).`;
    try {
      const j = JSON.parse(text) as { Fault?: { Error?: { Message?: string; Detail?: string }[] } };
      const e = j.Fault?.Error?.[0];
      if (e) message = e.Detail || e.Message || message;
    } catch {
      /* non-JSON error body — keep the generic message */
    }
    throw new Error(message);
  }

  return text ? JSON.parse(text) : {};
}
