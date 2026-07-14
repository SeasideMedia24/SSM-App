'use client';

// The signing panel under the contract document. On success the server action
// revalidates this page, which re-renders into the Welcome Packet view.

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signContract, type SignState } from './actions';

function SignButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-gradient rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? 'Signing…' : 'Sign & agree'}
    </button>
  );
}

export function SignForm({ token }: { token: string }) {
  const [state, action] = useActionState<SignState, FormData>(signContract, { ok: false, error: null });

  return (
    <form action={action} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-ink">Sign this agreement</h2>
      <p className="mt-1 text-sm text-slate-500">Type your full legal name to sign. This is a binding electronic signature.</p>

      <input type="hidden" name="token" value={token} />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Full name
          <input name="signer_name" required autoComplete="name" placeholder="Jane Doe" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Title (optional)
          <input name="signer_title" placeholder="e.g. Marketing Director" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal" />
        </label>
      </div>

      <label className="mt-4 flex items-start gap-2.5 text-sm text-slate-700">
        <input type="checkbox" name="agree" required className="mt-0.5 h-4 w-4 accent-teal" />
        <span>I have read and agree to the terms of this agreement.</span>
      </label>

      <p className="mt-3 text-xs italic text-slate-400">
        *By providing an e-signature, the signee acknowledges and agrees that it constitutes a binding form of payment authorization.
      </p>

      <div className="mt-5 flex items-center gap-3">
        <SignButton />
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
