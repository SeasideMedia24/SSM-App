'use client';

// "New contract" on the global Contracts page: a button that unfolds into a
// small form (project picker, name, amount, signed date). Contracts always
// start as drafts; status changes happen on the row inside the project.

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { createContract, type NewContractState } from '@/app/(app)/projects/contracts/actions';

export type ProjectOption = { id: string; title: string };

const field = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Adding…' : 'Add contract'}
    </Button>
  );
}

export function NewContractControl({ projects }: { projects: ProjectOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<NewContractState, FormData>(createContract, { ok: false, error: null });
  const ref = useRef<HTMLFormElement>(null);

  // On a successful save: clear the form and fold it away.
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        New contract
      </Button>
    );
  }

  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Project
        <select name="project_id" required defaultValue="" className={`min-w-[12rem] ${field}`}>
          <option value="" disabled>Choose a project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
        Contract name
        <input name="title" required placeholder="e.g. Brand film — production agreement" className={field} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Amount
        <span className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
          <input name="amount" type="number" step="0.01" min="0" placeholder="0.00" className={`w-28 pl-6 ${field}`} />
        </span>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Signed date
        <input name="signed_date" type="date" className={field} />
      </label>
      <SubmitButton />
      <button type="button" onClick={() => setOpen(false)} className="px-2 py-2 text-sm text-slate-400 hover:text-slate-700">
        Cancel
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
