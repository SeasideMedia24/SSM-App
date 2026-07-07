'use client';

// Share control for a saved quote (compact, lives in the table row).
// No link yet → "Share" creates one. With a link → copy / open / turn off.
// The link is /quote/<token> — the public, client-facing quote document.

import { useEffect, useState, useTransition } from 'react';
import { generateQuoteShareToken, revokeQuoteShareToken } from '@/app/(app)/calculator/actions';

export function ShareQuoteControl({ quoteId, token }: { quoteId: string; token: string | null }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  // Origin read after mount so server and first client render match.
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const link = token && origin ? `${origin}/quote/${token}` : '';

  const run = (action: (fd: FormData) => Promise<void>) => {
    const fd = new FormData();
    fd.set('id', quoteId);
    start(() => action(fd));
  };

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!token) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => run(generateQuoteShareToken)}
        className="text-xs font-medium text-sea hover:underline disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Share'}
      </button>
    );
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-sea hover:underline"
      >
        Shared ▾
      </button>
      {open && (
        <span className="absolute right-0 top-6 z-10 flex w-40 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-lg">
          <button type="button" onClick={copy} className="px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <a href={link} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
            Open / print
          </a>
          <button
            type="button"
            disabled={pending}
            onClick={() => { run(generateQuoteShareToken); setOpen(false); }}
            className="px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            New link
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => { run(revokeQuoteShareToken); setOpen(false); }}
            className="px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            Turn off link
          </button>
        </span>
      )}
    </span>
  );
}
