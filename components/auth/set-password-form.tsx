'use client';

// Password form for a freshly-invited team member (used on /welcome). Sets the
// password on their already-verified session, then sends them to My Work.

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const field =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

export function SetPasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError('Could not save the password. Try again.');
      setBusy(false);
      return;
    }
    // Full navigation (not router.push) so the server layouts re-read the role.
    window.location.assign('/my-work');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-white/95 p-6 shadow-2xl ring-1 ring-white/50 sm:p-8">
      <div>
        <h1 className="text-lg font-semibold text-ink">Welcome to the team!</h1>
        <p className="mt-1 text-sm text-slate-500">
          You’re signed in as <span className="font-medium text-ink">{email}</span>. Choose a password to finish setting up.
        </p>
      </div>

      <label htmlFor="password" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Password
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={field}
          autoComplete="new-password"
        />
      </label>
      <label htmlFor="confirm" className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        Confirm password
        <input
          id="confirm"
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={field}
          autoComplete="new-password"
        />
      </label>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="brand-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? 'Saving…' : 'Save password & enter'}
      </button>
    </form>
  );
}
