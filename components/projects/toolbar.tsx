'use client';

// Board/List view toggle + PARA-category filter for the Projects page.
// State lives in the URL (?view=&para=) so it survives refresh and is shareable.

import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const PARA_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'project', label: 'Projects' },
  { value: 'area', label: 'Areas' },
  { value: 'resource', label: 'Resources' },
  { value: 'archive', label: 'Archive' },
];

export function ProjectsToolbar({ view, para }: { view: 'board' | 'list'; para: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
        {(['board', 'list'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setParam('view', v === 'board' ? '' : v)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              view === v ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <select
        value={para}
        onChange={(e) => setParam('para', e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-teal"
      >
        {PARA_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
