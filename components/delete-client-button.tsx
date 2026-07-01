'use client';

// Delete a client, but only after an explicit in-UI confirmation
// (CLAUDE.md rule #4: no destructive action without confirmation).

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteClient } from '@/app/(app)/clients/actions';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? 'Deleting…' : 'Yes, delete'}
    </button>
  );
}

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        Delete client
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
      <span className="text-sm text-red-700">
        Delete <span className="font-medium">{clientName}</span> and all its projects and quotes?
      </span>
      <form action={deleteClient}>
        <input type="hidden" name="id" value={clientId} />
        <ConfirmButton />
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-sm text-slate-500 hover:text-slate-700"
      >
        Cancel
      </button>
    </div>
  );
}
