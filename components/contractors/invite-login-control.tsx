'use client';

// "App login" controls on a contractor's page. Invite (or re-invite) a team
// member, copy the link (in case email misbehaves), and — if a login exists but
// is wrong/stuck/orphaned — remove it and start fresh. A login being "linked"
// only means an auth user exists; it may still be a never-accepted invite, so
// the invite button stays available as a Resend.

import { useState, useTransition } from 'react';
import { inviteContractorLogin, removeContractorLogin, type InviteLoginResult } from '@/app/(app)/contractors/actions';

export function InviteLoginControl({
  contractorId,
  email,
  linked,
}: {
  contractorId: string;
  email: string | null;
  linked: boolean; // an auth user exists (may be a pending, never-accepted invite)
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<InviteLoginResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  function copy() {
    if (!result?.inviteUrl) return;
    navigator.clipboard.writeText(result.inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const invite = () => start(async () => { setResult(await inviteContractorLogin(contractorId)); });
  const remove = () => start(async () => { setResult(await removeContractorLogin(contractorId)); setConfirmingRemove(false); });

  return (
    <div className="flex flex-col gap-2">
      {linked && (
        <p className="text-xs font-medium text-emerald-600">
          ✓ Has a login — they see only their assigned projects and tasks.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !email}
          onClick={invite}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Working…' : linked ? 'Resend login link' : 'Invite to log in'}
        </button>

        {linked && !confirmingRemove && (
          <button type="button" onClick={() => setConfirmingRemove(true)} className="text-xs font-medium text-slate-400 hover:text-red-600">
            Remove login
          </button>
        )}
        {confirmingRemove && (
          <span className="inline-flex items-center gap-2 text-xs">
            <span className="text-slate-500">Delete their login &amp; start over?</span>
            <button type="button" disabled={pending} onClick={remove} className="font-medium text-red-600 hover:underline disabled:opacity-60">Yes, remove</button>
            <button type="button" onClick={() => setConfirmingRemove(false)} className="text-slate-400 hover:text-slate-600">Cancel</button>
          </span>
        )}

        {!email && <span className="text-xs text-slate-400">Add an email first (Edit).</span>}
        {result && !result.inviteUrl && (
          <span className={`text-xs font-medium ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>{result.message}</span>
        )}
      </div>

      {result?.inviteUrl && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-emerald-600">{result.message}</span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={result.inviteUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-80 max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 outline-none"
              aria-label="Invite link"
            />
            <button type="button" onClick={copy} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <span className="text-[11px] text-slate-400">Works once — a new link replaces it.</span>
          </div>
        </div>
      )}
    </div>
  );
}
