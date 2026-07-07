'use client';

// "Invite to onboard" control on the client detail page. Generates a private
// /onboard/<token> link the owner can copy — or email in one click — and the
// client fills in their own details, which update this client record.

import { useEffect, useState, useTransition } from 'react';
import { generateOnboardToken } from '@/app/(app)/clients/actions';

export function InviteControl({
  clientId,
  clientName,
  email,
  token,
}: {
  clientId: string;
  clientName: string;
  email: string | null;
  token: string | null;
}) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  // Origin is read after mount so the server and first client render match
  // (avoids a hydration mismatch on the link/mailto attributes).
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);
  const link = token && origin ? `${origin}/onboard/${token}` : '';

  // Pre-written invite email — opens in the owner's mail app, ready to send.
  // Edit the subject/body text here to change the message.
  const firstName = clientName.split(' ')[0];
  const subject = 'Let’s get your project started — Seaside Media';
  const body =
    `Hi ${firstName},\n\n` +
    `Great to be working with you! To get started, please fill in this short onboarding form — ` +
    `it tells us about you and your project so we can hit the ground running:\n\n` +
    `${link}\n\n` +
    `It only takes a couple of minutes. Any questions, just reply to this email.\n\n` +
    `Talk soon,\nSeaside Media`;
  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : '';

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!token) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => generateOnboardToken(clientId))}
        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Invite to onboard'}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-72 max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 outline-none"
      />
      <button type="button" onClick={copy} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      {email ? (
        <a
          href={mailto}
          className="rounded-lg bg-sea px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
        >
          Email invite
        </a>
      ) : (
        <span
          title="Add an email address to this client to send the invite"
          className="cursor-not-allowed rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400"
        >
          Email invite
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => generateOnboardToken(clientId))}
        className="text-xs text-slate-400 hover:text-slate-700 disabled:opacity-60"
      >
        New link
      </button>
    </div>
  );
}
