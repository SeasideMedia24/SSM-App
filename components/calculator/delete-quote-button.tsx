'use client';

// Delete a quote, but only after an explicit in-UI confirmation
// (CLAUDE.md rule #4). Compact variant for table rows.

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteQuote } from '@/app/(app)/calculator/actions';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-60">
      {pending ? 'Deleting…' : 'Yes, delete'}
    </button>
  );
}

export function DeleteQuoteButton({ quoteId, quoteTitle }: { quoteId: string; quoteTitle: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-slate-400 transition-colors hover:text-red-600"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1">
      <span className="max-w-40 truncate text-xs text-red-700" title={quoteTitle}>Delete “{quoteTitle}”?</span>
      <form action={deleteQuote} className="inline">
        <input type="hidden" name="id" value={quoteId} />
        <ConfirmButton />
      </form>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs text-slate-500 hover:text-slate-700">
        Cancel
      </button>
    </span>
  );
}
