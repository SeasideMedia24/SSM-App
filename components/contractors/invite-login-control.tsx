'use client';

// "Invite to log in" on a contractor's page (Slice B1). One click creates the
// invite, emails it via Resend, AND shows the copyable invite link — so even if
// email misbehaves, the owner can text/Slack the link and the person gets in.

import { useState, useTransition } from 'react';
import { inviteContractorLogin, type InviteLoginResult } from '@/app/(app)/contractors/actions';

export function InviteLoginControl({
  contractorId,
  email,
  linked,
}: {
  contractorId: string;
  email: string | null;
  linked: boolean; // user_id already set → they can log in
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<InviteLoginResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (linked) {
    return <p className="text-xs font-medium text-emerald-600">✓ Has a login — they see only their own projects and tasks.</p>;
  }

  function copy() {
    if (!result?.inviteUrl) return;
    navigator.clipboard.writeText(result.inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !email}
          onClick={() => start(async () => setResult(await inviteContractorLogin(contractorId)))}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Sending…' : result?.inviteUrl ? 'Send a fresh invite' : 'Invite to log in'}
        </button>
        {!email && <span className="text-xs text-slate-400">Add an email first (Edit).</span>}
        {result && (
          <span className={`text-xs font-medium ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>
            {result.message}
          </span>
        )}
      </div>
      {result?.inviteUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            readOnly
            value={result.inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-80 max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 outline-none"
            aria-label="Invite link"
          />
          <button
            type="button"
            onClick={copy}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <span className="text-[11px] text-slate-400">Works once — generating a new invite replaces it.</span>
        </div>
      )}
    </div>
  );
}
