'use client';

// Shows the public onboarding intake link with a copy button. The URL is built
// from the current origin, so it's correct in both local dev and production.

import { useEffect, useState } from 'react';

export function PublicOnboardLink() {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const link = origin ? `${origin}/onboard` : '/onboard';

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={link}
        onFocus={(e) => e.currentTarget.select()}
        className="w-80 max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600 outline-none"
      />
      <button type="button" onClick={copy} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <a href={link} target="_blank" rel="noreferrer" className="text-sm text-sea hover:underline">
        Preview
      </a>
    </div>
  );
}
