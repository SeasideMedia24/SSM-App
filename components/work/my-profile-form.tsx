'use client';

// Contractor self-edit form (My Profile). Contact + rates only — the database
// trigger rejects anything else even if this form were tampered with.

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { updateMyProfile, type MyProfileState } from '@/app/(work)/my-profile/actions';

type Me = {
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  rate_full: number | null;
  rate_half: number | null;
  rate_hourly: number | null;
};

const field =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-gradient self-start rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}

function Rate({ id, label, defaultValue }: { id: string; label: string; defaultValue: number | null }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      <span className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
        <input id={id} name={id} type="number" min="0" step="0.01" defaultValue={defaultValue ?? ''} className={`${field} w-full pl-6`} />
      </span>
    </label>
  );
}

export function MyProfileForm({ me }: { me: Me }) {
  const [state, action] = useActionState<MyProfileState, FormData>(updateMyProfile, { ok: false, error: null });

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {state.ok && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Saved ✓</p>}

      <label htmlFor="name" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Name <span className="text-red-500">*</span>
        <input id="name" name="name" required defaultValue={me.name} className={field} />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label htmlFor="email" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Email
          <input id="email" name="email" type="email" defaultValue={me.email ?? ''} className={field} />
        </label>
        <label htmlFor="phone" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Phone
          <input id="phone" name="phone" defaultValue={me.phone ?? ''} className={field} />
        </label>
      </div>

      <label htmlFor="role" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Role / craft
        <input id="role" name="role" placeholder="e.g. Editor, Camera Op" defaultValue={me.role ?? ''} className={field} />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Your rates</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Rate id="rate_full" label="Full day" defaultValue={me.rate_full} />
          <Rate id="rate_half" label="Half day" defaultValue={me.rate_half} />
          <Rate id="rate_hourly" label="Hourly" defaultValue={me.rate_hourly} />
        </div>
      </fieldset>

      {state.error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>}

      <SaveButton />
    </form>
  );
}
