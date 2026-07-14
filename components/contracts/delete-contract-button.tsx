'use client';

// Two-step delete so a contract is never removed by a single click (CLAUDE.md #4).

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteContract } from '@/app/(app)/contracts/actions';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-60">
      {pending ? 'Deleting…' : 'Confirm delete'}
    </button>
  );
}

export function DeleteContractButton({ contractId, projectId }: { contractId: string; projectId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs font-medium text-slate-400 transition-colors hover:text-red-600">
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <form action={deleteContract}>
        <input type="hidden" name="id" value={contractId} />
        <input type="hidden" name="project_id" value={projectId} />
        <ConfirmButton />
      </form>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs text-slate-500 hover:text-slate-700">
        Cancel
      </button>
    </div>
  );
}
