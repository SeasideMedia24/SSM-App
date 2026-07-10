'use client';

// The public form a contractor fills from their invite link. Pre-filled with
// what the owner already entered; only blank fields are saved on submit.

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitContractorOnboarding, type ContractorOnboardState } from '@/app/contractor-onboard/actions';

type Prefill = {
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Save my details'}
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

export function ContractorOnboardingForm({ token, prefill }: { token: string; prefill: Prefill }) {
  const [state, formAction] = useActionState<ContractorOnboardState, FormData>(submitContractorOnboarding, { ok: false, error: null });

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-white/95 p-8 text-center shadow-2xl ring-1 ring-white/50">
        <h2 className="text-lg font-semibold text-ink">Thank you, {prefill.name.split(' ')[0]}!</h2>
        <p className="mt-2 text-sm text-slate-500">Your details are saved. Seaside Media will be in touch about your projects.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl bg-white/95 p-6 shadow-2xl ring-1 ring-white/50 sm:p-8">
      <input type="hidden" name="token" value={token} />
      {/* Honeypot — hidden from real users. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <p className="text-sm text-slate-600">
        Hi <span className="font-medium text-ink">{prefill.name}</span> — please confirm your contact details and rates below.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label htmlFor="email" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Email
          <input id="email" name="email" type="email" defaultValue={prefill.email ?? ''} className={field} />
        </label>
        <label htmlFor="phone" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
          Phone
          <input id="phone" name="phone" defaultValue={prefill.phone ?? ''} className={field} />
        </label>
      </div>

      <label htmlFor="role" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Role / craft
        <input id="role" name="role" placeholder="e.g. Editor, Camera Op" defaultValue={prefill.role ?? ''} className={field} />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Your rates</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Rate id="rate_full" label="Full day" defaultValue={prefill.rate_full} />
          <Rate id="rate_half" label="Half day" defaultValue={prefill.rate_half} />
          <Rate id="rate_hourly" label="Hourly" defaultValue={prefill.rate_hourly} />
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
