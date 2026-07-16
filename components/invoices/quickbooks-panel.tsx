'use client';

// The QuickBooks panel on an invoice: two explicit steps — Sync to QuickBooks
// (creates/updates the QB invoice), then Send via QuickBooks (QB emails it with
// a Pay-Now link). Kept as separate clicks so nothing reaches a real client by
// accident. PaePae's send_invoice runs these same two steps behind a confirm.

import { useState, useTransition } from 'react';
import { syncInvoiceToQuickbooks, sendInvoiceViaQuickbooks } from '@/app/(app)/invoices/actions';

export function QuickbooksPanel({
  invoiceId, connected, clientEmail, qboDocNumber, qboSyncError, alreadySynced,
}: {
  invoiceId: string;
  connected: boolean;
  clientEmail: string | null;
  qboDocNumber: string | null;
  qboSyncError: string | null;
  alreadySynced: boolean;
}) {
  const [pending, start] = useTransition();
  const [synced, setSynced] = useState(alreadySynced);
  const docNumber = qboDocNumber;
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(qboSyncError);

  if (!connected) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-ink">QuickBooks</p>
        <p className="mt-1 text-sm text-slate-500">
          Connect QuickBooks in <a href="/settings#quickbooks" className="font-medium text-sea hover:underline">Settings</a> to create and send this invoice through your books.
        </p>
      </div>
    );
  }

  const sync = () =>
    start(async () => {
      setError(null); setMessage(null);
      const res = await syncInvoiceToQuickbooks(invoiceId);
      if (res.ok) { setSynced(true); setMessage(res.message); }
      else setError(res.error);
    });

  const send = () =>
    start(async () => {
      setError(null); setMessage(null);
      const res = await sendInvoiceViaQuickbooks(invoiceId);
      if (res.ok) setMessage(res.message);
      else setError(res.error);
    });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">QuickBooks</p>
        {synced && docNumber && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">#{docNumber}</span>}
      </div>

      {!clientEmail && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          This client has no email — add one on the client’s page so QuickBooks can send the invoice.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button" onClick={sync} disabled={pending}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-teal hover:text-sea disabled:opacity-60"
        >
          {pending ? 'Working…' : synced ? 'Re-sync' : 'Sync to QuickBooks'}
        </button>
        <button
          type="button" onClick={send} disabled={pending || !synced || !clientEmail}
          title={!synced ? 'Sync first' : !clientEmail ? 'Client needs an email' : 'QuickBooks emails the invoice'}
          className="brand-gradient rounded-lg px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
        >
          Send via QuickBooks
        </button>
      </div>

      {message && <p className="mt-2 text-xs text-emerald-700">{message}</p>}
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</p>}
    </div>
  );
}
