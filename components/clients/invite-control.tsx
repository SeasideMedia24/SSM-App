'use client';

// "Invite to onboard" control on the client detail page. Generates a private
// /onboard/<token> link the owner can copy and send; the client fills in their
// own details, which update this client record.

import { useState, useTransition } from 'react';
import { generateOnboardToken } from '@/app/(app)/clients/actions';

export function InviteControl({ clientId, token }: { clientId: string; token: string | null }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const link = token && typeof window !== 'undefined' ? `${window.location.origin}/onboard/${token}` : '';

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
        onClick={() => start(() => generateOnboardToken(clientId))}
        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Invite to onboard'}
      </button>
    );
  }

  return (
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
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => generateOnboardToken(clientId))}
        className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-60"
      >
        New link
      </button>
    </div>
  );
}
