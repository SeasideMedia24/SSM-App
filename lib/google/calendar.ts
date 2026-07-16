// Server-ONLY Google Calendar client (read-only sync).
//
// The OAuth refresh token lives in the google_accounts table and is only ever
// read here and in the OAuth routes — it never reaches the browser. Scope is
// calendar.readonly: this code can look at events but can never create, change,
// or delete anything in Google. (Write access arrives with PaePae's meeting
// booking in a later Phase 3 slice, behind its own consent + confirm gate.)

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type DB = SupabaseClient<Database>;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/calendar/v3';

// Are the env credentials in place? (Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
// in .env.local and Vercel — see .env.local.example.)
export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// One event, normalized for the dashboard calendar. Times are minutes from
// midnight IN THE EVENT'S OWN timezone: Google returns RFC3339 stamps with the
// local offset baked in (e.g. 2026-07-16T19:05:00-05:00), so slicing the local
// date/time out of the string avoids any server-timezone math entirely.
export type GoogleEvent = {
  id: string;
  title: string;
  calendarId: string; // which Google calendar it came from (for filtering)
  calendar: string; // that calendar's display name
  color: string | null;
  mergeSsm: boolean; // fold into the "Seaside Media" chip with the app's tasks
  dayIso: string;
  allDay: boolean;
  startMin?: number;
  endMin?: number;
  timeLabel?: string;
  htmlLink?: string;
};

export type GoogleSync =
  | { status: 'unconfigured' } // env vars missing
  | { status: 'disconnected' } // configured, but the user hasn't connected yet
  | { status: 'error'; message: string }
  | { status: 'ok'; events: GoogleEvent[] };

// ── Tokens ───────────────────────────────────────────────────────────────────

type Account = Database['public']['Tables']['google_accounts']['Row'];

export async function getGoogleAccount(supabase: DB): Promise<Account | null> {
  const { data } = await supabase.from('google_accounts').select('*').maybeSingle();
  return data ?? null;
}

// A valid access token, refreshed (and persisted) when the cached one is
// missing or about to expire. Returns null when Google rejects the refresh —
// e.g. the user revoked access — in which case they need to reconnect.
async function accessTokenFor(supabase: DB, account: Account): Promise<string | null> {
  const expiresAt = account.access_token_expires_at ? Date.parse(account.access_token_expires_at) : 0;
  if (account.access_token && expiresAt > Date.now() + 60_000) return account.access_token;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;

  await supabase
    .from('google_accounts')
    .update({
      access_token: json.access_token,
      access_token_expires_at: new Date(Date.now() + (json.expires_in ?? 3600) * 1000).toISOString(),
    })
    .eq('user_id', account.user_id);

  return json.access_token;
}

// A ready-to-use access token for other Google modules (lib/google/act.ts).
// Distinguishes "never connected" from "connection broken" so callers can give
// the right instruction.
export async function googleAccessToken(
  supabase: DB,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  if (!googleConfigured()) {
    return { ok: false, error: 'Google isn’t configured on the server (missing GOOGLE_CLIENT_ID/SECRET).' };
  }
  const account = await getGoogleAccount(supabase);
  if (!account) {
    return { ok: false, error: 'Google isn’t connected yet — connect it in Settings → Google Calendar.' };
  }
  const token = await accessTokenFor(supabase, account);
  if (!token) {
    return { ok: false, error: 'Google rejected the saved connection — reconnect it in Settings → Google Calendar.' };
  }
  return { ok: true, token };
}

// ── Free/busy (for kickoff scheduling) ───────────────────────────────────────

// Busy intervals across the owner's INCLUDED calendars in a window. Used by the
// client portal's self-serve kickoff booking to compute open slots. Call with
// the admin client from the anonymous portal so it reads the OWNER's calendar.
export async function freeBusy(
  supabase: DB,
  range: { timeMin: string; timeMax: string },
): Promise<{ ok: true; busy: { start: string; end: string }[] } | { ok: false; error: string }> {
  const auth = await googleAccessToken(supabase);
  if (!auth.ok) return { ok: false, error: auth.error };
  const account = await getGoogleAccount(supabase);

  const { data: cals } = await supabase
    .from('google_calendars')
    .select('id')
    .eq('user_id', account?.user_id ?? '')
    .eq('included', true);
  const items = cals && cals.length > 0 ? cals.map((c) => ({ id: c.id })) : [{ id: 'primary' }];

  const res = await fetch(`${API}/freeBusy`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin: range.timeMin, timeMax: range.timeMax, items }),
  });
  if (!res.ok) return { ok: false, error: 'Could not read availability from Google.' };

  const json = (await res.json()) as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> };
  const busy: { start: string; end: string }[] = [];
  for (const cal of Object.values(json.calendars ?? {})) for (const b of cal.busy ?? []) busy.push(b);
  return { ok: true, busy };
}

// ── Calendar list ────────────────────────────────────────────────────────────

// Pull the user's calendar list from Google and mirror it into
// google_calendars. New calendars arrive `included` by default; the user's
// existing include/exclude choices are preserved.
export async function syncCalendarList(supabase: DB, userId: string): Promise<void> {
  const account = await getGoogleAccount(supabase);
  if (!account) return;
  const token = await accessTokenFor(supabase, account);
  if (!token) return;

  const res = await fetch(
    `${API}/users/me/calendarList?fields=items(id,summary,backgroundColor,primary)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return;

  const json = (await res.json()) as {
    items?: { id: string; summary?: string; backgroundColor?: string; primary?: boolean }[];
  };
  const items = json.items ?? [];
  if (items.length === 0) return;

  const { data: existing } = await supabase.from('google_calendars').select('id');
  const known = new Set((existing ?? []).map((c) => c.id));

  for (const cal of items) {
    const row = {
      summary: cal.summary ?? '',
      color: cal.backgroundColor ?? null,
      is_primary: cal.primary ?? false,
    };
    if (known.has(cal.id)) {
      await supabase.from('google_calendars').update(row).eq('id', cal.id).eq('user_id', userId);
    } else {
      await supabase.from('google_calendars').insert({ ...row, id: cal.id, user_id: userId });
    }
  }
}

// ── Events ───────────────────────────────────────────────────────────────────

type RawEvent = {
  id?: string;
  status?: string;
  summary?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

// "19:05" → "7:05 PM"
function timeLabelOf(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  const suffix = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === '00' ? `${hour12} ${suffix}` : `${hour12}:${m} ${suffix}`;
}

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// Fetch every included calendar's events for [firstIso, lastIso] (inclusive).
// `tz` is the VIEWER's IANA timezone (e.g. America/New_York): we pass it to
// Google so every returned dateTime is already in the viewer's wall-clock,
// which is what makes the times line up on the grid (fixes the "3 hours off"
// bug — before, Google returned each calendar's own zone and we sliced it raw).
export async function syncGoogleEvents(
  supabase: DB,
  firstIso: string,
  lastIso: string,
  tz = 'America/New_York',
): Promise<GoogleSync> {
  if (!googleConfigured()) return { status: 'unconfigured' };
  const account = await getGoogleAccount(supabase);
  if (!account) return { status: 'disconnected' };

  const token = await accessTokenFor(supabase, account);
  if (!token) {
    return { status: 'error', message: 'Google rejected the saved connection — reconnect it in Settings.' };
  }

  const { data: calendars } = await supabase
    .from('google_calendars')
    .select('id, summary, color, merge_ssm')
    .eq('included', true)
    .limit(15);
  if (!calendars || calendars.length === 0) return { status: 'ok', events: [] };

  // Pad a day each side so timezone offsets can't drop edge events; each event
  // is bucketed by its own local date below, then filtered back to the range.
  const timeMin = `${addDaysIso(firstIso, -1)}T00:00:00Z`;
  const timeMax = `${addDaysIso(lastIso, 2)}T00:00:00Z`;

  try {
    const perCalendar = await Promise.all(
      calendars.map(async (cal) => {
        const url =
          `${API}/calendars/${encodeURIComponent(cal.id)}/events` +
          `?singleEvents=true&orderBy=startTime&maxResults=250` +
          `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
          `&timeZone=${encodeURIComponent(tz)}` +
          `&fields=items(id,status,summary,htmlLink,start,end)`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return [];
        const json = (await res.json()) as { items?: RawEvent[] };
        return (json.items ?? []).flatMap((ev) => normalize(ev, cal, firstIso, lastIso));
      }),
    );
    return { status: 'ok', events: perCalendar.flat() };
  } catch {
    return { status: 'error', message: 'Could not reach Google Calendar right now.' };
  }
}

// Expand one raw Google event into per-day calendar entries within the range.
function normalize(
  ev: RawEvent,
  cal: { id: string; summary: string; color: string | null; merge_ssm: boolean },
  firstIso: string,
  lastIso: string,
): GoogleEvent[] {
  if (!ev.id || ev.status === 'cancelled') return [];
  const title = ev.summary?.trim() || '(untitled)';
  const base = {
    id: ev.id,
    title,
    calendarId: cal.id,
    calendar: cal.summary,
    color: cal.color,
    mergeSsm: cal.merge_ssm,
    htmlLink: ev.htmlLink,
  };

  // All-day: start.date is inclusive, end.date is EXCLUSIVE — one entry per day.
  if (ev.start?.date) {
    const out: GoogleEvent[] = [];
    const endExclusive = ev.end?.date ?? addDaysIso(ev.start.date, 1);
    for (let day = ev.start.date; day < endExclusive; day = addDaysIso(day, 1)) {
      if (day >= firstIso && day <= lastIso) out.push({ ...base, dayIso: day, allDay: true });
      if (out.length > 62) break; // absurd multi-month spans — cap defensively
    }
    return out;
  }

  // Timed: bucket on the event's own local start date.
  if (ev.start?.dateTime) {
    const dayIso = ev.start.dateTime.slice(0, 10);
    if (dayIso < firstIso || dayIso > lastIso) return [];
    const startHm = ev.start.dateTime.slice(11, 16);
    const sameDayEnd = ev.end?.dateTime?.slice(0, 10) === dayIso ? ev.end?.dateTime : undefined;
    const startMin = minutesOf(startHm);
    const endMin = sameDayEnd ? minutesOf(sameDayEnd.slice(11, 16)) : 24 * 60;
    return [{
      ...base,
      dayIso,
      allDay: false,
      startMin,
      endMin: Math.max(endMin, startMin + 15), // floor so short events stay visible
      timeLabel: timeLabelOf(startHm),
    }];
  }

  return [];
}

// Local copy of lib/dashboard/calendar's addDays — kept here so this module has
// no dependency on the UI helpers.
function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
