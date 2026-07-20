'use client';

// Settings → QuickBooks: connect / disconnect. The tokens never reach this
// component — it only sees whether a company is connected and its name.
// Mirrors GoogleCalendarSettings.

import { useState, useTransition } from 'react';
import { disconnectQuickbooks } from '@/app/(app)/settings/quickbooks-actions';

type EnvVarState = 'ok' | 'missing' | 'empty';

export function QuickbooksSettings({
  configured,
  envStatus,
  companyName,
  flag,
}: {
  configured: boolean; // env credentials present?
  envStatus?: Record<string, EnvVarState>; // which credential is missing/blank (names only)
  companyName: string | null | undefined; // undefined = not connected
  flag?: string; // ?quickbooks=… status from the OAuth round trip
}) {
  // Spell out exactly what the SERVER sees, so a bad deploy is obvious.
  const envProblems = Object.entries(envStatus ?? {})
    .filter(([, s]) => s !== 'ok')
    .map(([name, s]) => `${name}: ${s === 'empty' ? 'present but blank' : 'not found'}`);
  const [pending, start] = useTransition();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const connected = companyName !== undefined;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {flag === 'connected' && (
        <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          QuickBooks connected ✓ — invoices can now be created and sent through your books.
        </p>
      )}
      {flag === 'denied' && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Connection cancelled at QuickBooks — nothing was linked.
        </p>
      )}
      {flag === 'failed' && (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          The QuickBooks connection didn’t complete. Try again — if it keeps failing, tell Claude.
        </p>
      )}
      {flag === 'missing-env' && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          QuickBooks credentials aren’t set up yet — add QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET
          in Vercel (Project → Settings → Environment Variables) and redeploy, then try again.
        </p>
      )}

      {!connected ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Connect QuickBooks so invoices are created and sent through your books, and payments sync back
            automatically. Your accounting data stays in QuickBooks — the app only creates and reads invoices.
          </p>
          {configured ? (
            <a
              href="/api/quickbooks/oauth/start"
              className="brand-gradient rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110"
            >
              Connect QuickBooks
            </a>
          ) : (
            <div className="max-w-sm rounded-xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
              <p>Waiting on QuickBooks credentials.</p>
              {envProblems.length > 0 && (
                <ul className="mt-1 list-disc pl-4 text-xs">
                  {envProblems.map((p) => <li key={p}><code>{p}</code></li>)}
                </ul>
              )}
              <p className="mt-1 text-xs">
                Add them in Vercel (Project → Settings → Environment Variables, scoped to Production),
                then <strong>redeploy</strong>. For local dev, use <code>.env.local</code>.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Connected to <span className="font-medium text-ink">{companyName || 'your QuickBooks company'}</span>{' '}
            <span className="text-xs text-emerald-600">✓</span>
          </p>
          <div className="flex items-center gap-3">
            {/* Re-runs consent — handy if the connection ever needs refreshing. */}
            <a
              href="/api/quickbooks/oauth/start"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea"
            >
              Reconnect
            </a>
            {confirmingDisconnect ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Disconnect and forget the tokens?</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => start(async () => { await disconnectQuickbooks(); setConfirmingDisconnect(false); })}
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
        </div>
      )}
    </div>
  );
}
