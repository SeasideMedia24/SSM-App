'use client';

// Public self-serve intake for a NEW team member (no invite link needed). Anyone
// with the /contractor-onboard link can add themselves; it creates a fresh
// contractor record for Seaside Media to review.

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitContractorIntake, type ContractorOnboardState } from '@/app/contractor-onboard/actions';

const field =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Submit my details'}
    </button>
  );
}

function Rate({ id, label }: { id: string; label: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-xs text-slate-500">
      {label}
      <span className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
        <input id={id} name={id} type="number" min="0" step="0.01" className={`${field} w-full pl-6`} />
      </span>
    </label>
  );
}

export function ContractorIntakeForm() {
  const [state, formAction] = useActionState<ContractorOnboardState, FormData>(submitContractorIntake, { ok: false, error: null });

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-white/95 p-8 text-center shadow-2xl ring-1 ring-white/50">
        <h2 className="text-lg font-semibold text-ink">Thanks — you’re in!</h2>
        <p className="mt-2 text-sm text-slate-500">Your details are saved. Seaside Media will be in touch about your projects.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl bg-white/95 p-6 shadow-2xl ring-1 ring-white/50 sm:p-8">
      {/* Honeypot — hidden from real users. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div>
        <h2 className="text-lg font-semibold text-ink">Join the Seaside Media team</h2>
        <p className="mt-1 text-sm text-slate-500">Tell us who you are and how to reach you.</p>
      </div>

      <label htmlFor="name" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Name <span className="text-red-500">*</span>
        <input id="name" name="name" required placeholder="Your full name" className={field} />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label htmlFor="email" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Email
          <input id="email" name="email" type="email" className={field} />
        </label>
        <label htmlFor="phone" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Phone
          <input id="phone" name="phone" className={field} />
        </label>
      </div>

      <label htmlFor="role" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Role / craft
        <input id="role" name="role" placeholder="e.g. Editor, Camera Op" className={field} />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Your rates (optional)</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Rate id="rate_full" label="Full day" />
          <Rate id="rate_half" label="Half day" />
          <Rate id="rate_hourly" label="Hourly" />
        </div>
      </fieldset>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
      )}

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
