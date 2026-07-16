// Server-ONLY Google WRITE operations: send an email (Gmail) and book a
// calendar event (Google Calendar, with a Meet link).
//
// These are PaePae's two "outside world" powers, and they are only ever called
// from executeAction AFTER the owner clicks Confirm on a proposal card — never
// autonomously. They ride the same OAuth connection as the read-only calendar
// sync, but need broader scopes (gmail.send + calendar.events); if the stored
// consent predates those scopes, Google answers 403 and we return a friendly
// "update permissions in Settings" message instead of failing cryptically.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { googleAccessToken } from './calendar';

type DB = SupabaseClient<Database>;

const SCOPE_HINT =
  'Google needs updated permissions for this — open Settings → Google Calendar, click “Update permissions”, approve at Google, then ask me again.';

type ActResult =
  | { ok: true; detail: string; meetLink?: string | null; htmlLink?: string | null }
  | { ok: false; error: string };

// RFC 2047-encode a header value so subjects with any characters survive.
const encodeHeader = (v: string) => `=?UTF-8?B?${Buffer.from(v, 'utf8').toString('base64')}?=`;

// ── Email (Gmail) ────────────────────────────────────────────────────────────

export async function sendGmail(
  supabase: DB,
  { to, cc, subject, body }: { to: string; cc?: string[]; subject: string; body: string },
): Promise<ActResult> {
  const auth = await googleAccessToken(supabase);
  if (!auth.ok) return { ok: false, error: auth.error };

  const mime = [
    `To: ${to}`,
    ...(cc && cc.length > 0 ? [`Cc: ${cc.join(', ')}`] : []),
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ].join('\r\n');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: Buffer.from(mime, 'utf8').toString('base64url') }),
  });

  if (res.status === 403) return { ok: false, error: SCOPE_HINT };
  if (!res.ok) return { ok: false, error: 'Gmail rejected the send. Try again in a moment.' };

  return { ok: true, detail: `Email sent to ${to}${cc && cc.length > 0 ? ` (cc: ${cc.join(', ')})` : ''}.` };
}

// ── Calendar events (booking) ────────────────────────────────────────────────

export async function createCalendarEvent(
  supabase: DB,
  {
    title,
    description,
    location,
    start,
    end,
    timeZone,
    attendees,
    withMeet,
  }: {
    title: string;
    description?: string;
    location?: string;
    start: string; // YYYY-MM-DDTHH:MM (local to timeZone)
    end: string;
    timeZone: string;
    attendees: string[];
    withMeet: boolean;
  },
): Promise<ActResult> {
  const auth = await googleAccessToken(supabase);
  if (!auth.ok) return { ok: false, error: auth.error };

  const event: Record<string, unknown> = {
    summary: title,
    description,
    location,
    start: { dateTime: `${start}:00`, timeZone },
    end: { dateTime: `${end}:00`, timeZone },
    attendees: attendees.map((email) => ({ email })),
    ...(withMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId: crypto.randomUUID(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }
      : {}),
  };

  // sendUpdates=all → Google emails the invite to every attendee for us.
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    },
  );

  if (res.status === 403) return { ok: false, error: SCOPE_HINT };
  if (!res.ok) return { ok: false, error: 'Google Calendar rejected the event. Check the times and try again.' };

  const created = (await res.json()) as { htmlLink?: string; hangoutLink?: string };
  const bits = [
    `Meeting booked${attendees.length > 0 ? ` — invites emailed to ${attendees.join(', ')}` : ''}.`,
    created.hangoutLink ? `Google Meet: ${created.hangoutLink}` : null,
    created.htmlLink ? `Calendar: ${created.htmlLink}` : null,
  ].filter(Boolean);
  return { ok: true, detail: bits.join('\n'), meetLink: created.hangoutLink ?? null, htmlLink: created.htmlLink ?? null };
}
