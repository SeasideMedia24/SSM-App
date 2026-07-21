'use client';

// Owner control on the project page: set the "files ready to review" link
// (e.g. Frame.io) that the client sees on their portal. Empty saves clears it.

import { useState, useTransition } from 'react';
import { setReviewLink } from '@/app/(app)/projects/portal-actions';

export function ReviewLinkControl({ projectId, url: initialUrl }: { projectId: string; url: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      setError(null);
      setSaved(false);
      const res = await setReviewLink(projectId, url);
      if (res.ok) { setUrl(res.url ?? ''); setSaved(true); setTimeout(() => setSaved(false), 1500); }
      else setError(res.error);
    });

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-slate-500">Review link (Frame.io) — shows on the client portal when set</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://f.io/…"
          className="w-72 max-w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-teal"
        />
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium text-sea hover:underline">Open</a>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
