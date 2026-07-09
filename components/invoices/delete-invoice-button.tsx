'use client';

// Two-step delete so an invoice is never removed by a single click (CLAUDE.md #4).

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteInvoice } from '@/app/(app)/invoices/actions';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-60">
      {pending ? 'Deleting…' : 'Confirm delete'}
    </button>
  );
}

export function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
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
      <form action={deleteInvoice}>
        <input type="hidden" name="id" value={invoiceId} />
        <ConfirmButton />
      </form>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs text-slate-500 hover:text-slate-700">
        Cancel
      </button>
    </div>
  );
}
