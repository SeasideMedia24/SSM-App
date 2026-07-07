'use client';

// The public onboarding form. A prospective client fills this in themselves.
// On success it swaps to a thank-you state. Includes a hidden honeypot field
// ("website") that real users never see — bots that fill it get silently dropped.

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { motion } from 'motion/react';
import { submitOnboarding, type OnboardState } from '@/app/onboard/actions';
import { PROJECT_TYPES } from '@/lib/projects/template';
import { BUDGET_RANGES, TIMELINE_OPTIONS } from '@/lib/validation/onboarding';

const field =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

type Prefill = { name?: string | null; company?: string | null; email?: string | null; phone?: string | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-gradient w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? 'Sending…' : 'Submit'}
    </button>
  );
}

export function OnboardingForm({ token, prefill }: { token?: string; prefill?: Prefill }) {
  const [state, action] = useActionState<OnboardState, FormData>(submitOnboarding, { ok: false, error: null });

  if (state.ok) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white/95 p-8 text-center shadow-2xl ring-1 ring-white/50"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal/15 text-2xl text-sea">✓</div>
        <h2 className="text-lg font-semibold text-ink">Thank you!</h2>
        <p className="mt-2 text-sm text-slate-500">
          We’ve got your details and the Seaside Media team will be in touch shortly.
        </p>
      </motion.div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-2xl bg-white/95 p-6 shadow-2xl ring-1 ring-white/50 sm:p-8">
      {token && <input type="hidden" name="token" value={token} />}
      {/* Honeypot — visually hidden, off-screen, not focusable. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Your name" required>
          <input name="name" required defaultValue={prefill?.name ?? ''} className={field} />
        </Field>
        <Field label="Company">
          <input name="company" defaultValue={prefill?.company ?? ''} className={field} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={prefill?.email ?? ''} className={field} />
        </Field>
        <Field label="Phone">
          <input name="phone" defaultValue={prefill?.phone ?? ''} className={field} />
        </Field>
      </div>

      <Field label="What kind of project?">
        <select name="project_type" defaultValue="" className={field}>
          <option value="">Choose one…</option>
          {PROJECT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Tell us about it">
        <textarea name="project_description" rows={4} placeholder="Goals, audience, deliverables, anything helpful…" className={field} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Budget range">
          <select name="budget_range" defaultValue="" className={field}>
            <option value="">Choose one…</option>
            {BUDGET_RANGES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Timeline">
          <select name="desired_timeline" defaultValue="" className={field}>
            <option value="">Choose one…</option>
            {TIMELINE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <Field label="How did you hear about us?">
        <input name="heard_from" className={field} />
      </Field>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
