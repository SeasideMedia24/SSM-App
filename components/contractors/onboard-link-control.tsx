'use client';

// Owner-side control on a contractor's page: create/copy a private self-onboarding
// link, or show that they've already onboarded. The full URL is built at copy
// time from window.location.origin (no origin stored in state).

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { generateContractorOnboardToken } from '@/app/(app)/contractors/actions';

function TokenButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal hover:text-sea disabled:opacity-60">
      {pending ? 'Working…' : label}
    </button>
  );
}

export function OnboardLinkControl({
  contractorId,
  token,
  onboardedAt,
}: {
  contractorId: string;
  token: string | null;
  onboardedAt: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const path = token ? `/contractor-onboard/${token}` : null;

  async function copy() {
    if (!path) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the link is visible to copy manually */
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {onboardedAt && (
        <p className="text-xs font-medium text-emerald-600">✓ Onboarded {new Date(onboardedAt).toLocaleDateString()}</p>
      )}

      {path ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">{path}</code>
          <button type="button" onClick={copy} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <form action={generateContractorOnboardToken}>
            <input type="hidden" name="id" value={contractorId} />
            <TokenButton label="Regenerate" />
          </form>
        </div>
      ) : (
        <form action={generateContractorOnboardToken}>
          <input type="hidden" name="id" value={contractorId} />
          <TokenButton label="Create onboarding link" />
        </form>
      )}
    </div>
  );
}
