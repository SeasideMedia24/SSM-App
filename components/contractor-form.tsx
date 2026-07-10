'use client';

// Shared add/edit form for a contractor / team member. Pass an existing record
// to edit, or leave it undefined to create a new one. Mirrors ClientForm.

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveContractor, type ContractorFormState } from '@/app/(app)/contractors/actions';
import { Button } from '@/components/ui/button';
import { CONTRACTOR_TYPES } from '@/lib/projects/status';
import type { Database } from '@/types/database.types';

type Contractor = Database['public']['Tables']['contractors']['Row'];

const initialState: ContractorFormState = { error: null };

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : editing ? 'Save changes' : 'Add to team'}
    </Button>
  );
}

const fieldClass =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

function RateInput({ id, label, defaultValue }: { id: string; label: string; defaultValue: number | null | undefined }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      <span className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
        <input id={id} name={id} type="number" min="0" step="0.01" defaultValue={defaultValue ?? ''} className={`${fieldClass} w-full pl-6`} />
      </span>
    </label>
  );
}

export function ContractorForm({ contractor }: { contractor?: Contractor }) {
  const [state, formAction] = useActionState(saveContractor, initialState);
  const editing = Boolean(contractor);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {contractor && <input type="hidden" name="id" value={contractor.id} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-slate-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input id="name" name="name" required defaultValue={contractor?.name ?? ''} className={fieldClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className="text-sm font-medium text-slate-700">Type</label>
          <select id="type" name="type" defaultValue={contractor?.type ?? 'external'} className={fieldClass}>
            {CONTRACTOR_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-sm font-medium text-slate-700">Role / craft</label>
          <input id="role" name="role" placeholder="e.g. Editor, Camera Op" defaultValue={contractor?.role ?? ''} className={fieldClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">Email</label>
          <input id="email" name="email" type="email" defaultValue={contractor?.email ?? ''} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone</label>
          <input id="phone" name="phone" defaultValue={contractor?.phone ?? ''} className={fieldClass} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Rates</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RateInput id="rate_full" label="Full day" defaultValue={contractor?.rate_full} />
          <RateInput id="rate_half" label="Half day" defaultValue={contractor?.rate_half} />
          <RateInput id="rate_hourly" label="Hourly" defaultValue={contractor?.rate_hourly} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">Notes</label>
        <textarea id="notes" name="notes" rows={4} defaultValue={contractor?.notes ?? ''} className={fieldClass} />
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SaveButton editing={editing} />
        <Link href={contractor ? `/contractors/${contractor.id}` : '/contractors'} className="text-sm text-slate-500 hover:text-slate-700">
          Cancel
        </Link>
      </div>
    </form>
  );
}
