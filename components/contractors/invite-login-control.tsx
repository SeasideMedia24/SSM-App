'use client';

// "Invite to log in" on a contractor's page (Slice B1). One click emails them a
// Supabase invite; they set a password and land in their scoped "My Work" view.

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

  if (linked) {
    return <p className="text-xs font-medium text-emerald-600">✓ Has a login — they see only their own projects and tasks.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending || !email}
        onClick={() => start(async () => setResult(await inviteContractorLogin(contractorId)))}
        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Invite to log in'}
      </button>
      {!email && <span className="text-xs text-slate-400">Add an email first (Edit).</span>}
      {result && (
        <span className={`text-xs font-medium ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>
          {result.message}
        </span>
      )}
    </div>
  );
}
