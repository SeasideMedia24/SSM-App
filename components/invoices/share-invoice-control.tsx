'use client';

// Share control for an invoice — the invoice twin of ShareQuoteControl.
// No link yet → "Share link" creates one. With a link → copy / open / replace /
// turn off. The link is /invoice/<token>, the public printable document.
// Keeps the token in local state so results show instantly, and surfaces a
// friendly hint if the share-token migration hasn't been applied yet.

import { useEffect, useState, useTransition } from 'react';
import { generateInvoiceShareToken, revokeInvoiceShareToken } from '@/app/(app)/invoices/actions';

export function ShareInvoiceControl({ invoiceId, token: initialToken }: { invoiceId: string; token: string | null }) {
  const [token, setToken] = useState(initialToken);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Origin read after mount so server and first client render match.
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const link = token && origin ? `${origin}/invoice/${token}` : '';

  const generate = () =>
    start(async () => {
      setError(null);
      const res = await generateInvoiceShareToken(invoiceId);
      if (res.ok) setToken(res.token);
      else setError(res.error);
    });

  const revoke = () =>
    start(async () => {
      setError(null);
      const res = await revokeInvoiceShareToken(invoiceId);
      if (res.ok) setToken(null);
      else setError(res.error);
    });

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {!token ? (
        <button
          type="button"
          disabled={pending}
          onClick={generate}
          className="self-start rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Share link'}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="w-72 max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 outline-none"
          />
          <button type="button" onClick={copy} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a href={link} target="_blank" rel="noreferrer" className="rounded-lg bg-sea px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110">
            Open / print
          </a>
          <button type="button" disabled={pending} onClick={generate} className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-60">
            New link
          </button>
          <button type="button" disabled={pending} onClick={revoke} className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-60">
            Turn off
          </button>
        </div>
      )}
      {error && <p className="max-w-md rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">{error}</p>}
    </div>
  );
}
