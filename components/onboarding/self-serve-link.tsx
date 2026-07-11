'use client';

// A shareable public onboarding link (copy + preview). Used on the Onboarding
// tab for the two self-serve links — new clients and new team members — that
// anyone can open to onboard themselves. The full URL is built from the current
// origin so it's correct in both local dev and production.

import { useEffect, useState } from 'react';

export function SelfServeLink({ title, description, path }: { title: string; description: string; path: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const link = origin ? `${origin}${path}` : path;

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 outline-none"
        />
        <button type="button" onClick={copy} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <a href={path} target="_blank" rel="noreferrer" className="text-xs text-sea hover:underline">Preview</a>
      </div>
    </div>
  );
}
