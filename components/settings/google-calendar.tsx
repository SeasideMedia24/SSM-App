'use client';

// Settings → Google Calendar: connect/disconnect, and choose which calendars
// feed the dashboard. The tokens themselves never reach this component — it
// only sees the connection status and the calendar list.

import { useState, useTransition } from 'react';
import { setCalendarIncluded, setCalendarMergeSsm, disconnectGoogle } from '@/app/(app)/settings/google-actions';

export type GoogleCalendarRow = {
  id: string;
  summary: string;
  color: string | null;
  is_primary: boolean;
  included: boolean;
  merge_ssm: boolean;
};

export function GoogleCalendarSettings({
  configured,
  connectedEmail,
  calendars,
  flag,
}: {
  configured: boolean; // env credentials present?
  connectedEmail: string | null | undefined; // undefined = not connected
  calendars: GoogleCalendarRow[];
  flag?: string; // ?google=… status from the OAuth round trip
}) {
  const [pending, start] = useTransition();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const connected = connectedEmail !== undefined;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Status banner from the OAuth round trip */}
      {flag === 'connected' && (
        <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Google Calendar connected ✓ — pick which calendars to show below.
        </p>
      )}
      {flag === 'denied' && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Connection cancelled at Google — nothing was linked.
        </p>
      )}
      {flag === 'failed' && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          The Google connection didn’t complete. Try again — if it keeps failing, tell Claude.
        </p>
      )}
      {flag === 'missing-env' && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Google credentials aren’t set up yet — add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to
          .env.local (see .env.local.example), restart the app, and try again.
        </p>
      )}

      {!connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Connect your Google account to see your personal calendar alongside studio work on the
            dashboard. Read-only: the app can never change or delete your Google events.
          </p>
          {configured ? (
            <a
              href="/api/google/oauth/start"
              className="brand-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110"
            >
              Connect Google Calendar
            </a>
          ) : (
            <span className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
              Waiting on Google credentials (.env.local)
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              Connected as <span className="font-medium text-ink">{connectedEmail ?? 'your Google account'}</span>{' '}
              <span className="text-xs text-emerald-600">✓ read-only</span>
            </p>
            {/* Re-runs the consent flow — needed once after new powers (email
                sending / meeting booking) are added, and harmless any time. */}
            <a
              href="/api/google/oauth/start"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea"
            >
              Update permissions
            </a>
            {confirmingDisconnect ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Disconnect and forget the tokens?</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(async () => { await disconnectGoogle(); setConfirmingDisconnect(false); })}
                  className="font-medium text-red-600 disabled:opacity-60"
                >
                  {pending ? 'Disconnecting…' : 'Yes, disconnect'}
                </button>
                <button type="button" onClick={() => setConfirmingDisconnect(false)} className="text-slate-400">
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDisconnect(true)}
                className="text-sm text-slate-400 transition-colors hover:text-red-600"
              >
                Disconnect
              </button>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Calendars on the dashboard
            </p>
            <p className="mb-2 text-xs text-slate-400">
              Tick a calendar to show it. Mark one “＝ Seaside Media” to fold its events in with your
              app tasks under a single Seaside Media chip.
            </p>
            {calendars.length === 0 ? (
              <p className="text-sm text-slate-400">
                No calendars found yet — reconnect, or refresh this page.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {calendars.map((cal) => (
                  <li key={cal.id} className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        defaultChecked={cal.included}
                        disabled={pending}
                        onChange={(e) => {
                          const included = e.target.checked;
                          start(() => setCalendarIncluded(cal.id, included));
                        }}
                        className="h-4 w-4 accent-teal"
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cal.color ?? '#94a3b8' }}
                      />
                      {cal.summary || cal.id}
                      {cal.is_primary && <span className="text-[11px] text-slate-400">(main)</span>}
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        defaultChecked={cal.merge_ssm}
                        disabled={pending}
                        onChange={(e) => {
                          const merge = e.target.checked;
                          start(() => setCalendarMergeSsm(cal.id, merge));
                        }}
                        className="h-3.5 w-3.5 accent-teal"
                      />
                      ＝ Seaside Media
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
