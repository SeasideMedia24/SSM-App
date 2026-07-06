'use client';

// Board/List view toggle + Project-type and Client-type filters for the Projects
// page. State lives in the URL (?view=&ptype=&ctype=) so it survives refresh.

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PROJECT_TYPES } from '@/lib/projects/template';
import { CLIENT_TYPES } from '@/lib/projects/status';

export function ProjectsToolbar({
  view,
  ptype,
  ctype,
}: {
  view: 'board' | 'list';
  ptype: string;
  ctype: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  const selectCls =
    'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-teal';

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
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

      <select value={ptype} onChange={(e) => setParam('ptype', e.target.value)} className={selectCls} aria-label="Filter by project type">
        <option value="">All project types</option>
        {PROJECT_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <select value={ctype} onChange={(e) => setParam('ctype', e.target.value)} className={selectCls} aria-label="Filter by client type">
        <option value="">All client types</option>
        {CLIENT_TYPES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      {(ptype || ctype) && (
        <button
          onClick={() => {
            const next = new URLSearchParams(params.toString());
            next.delete('ptype');
            next.delete('ctype');
            router.push(`${pathname}?${next.toString()}`);
          }}
          className="text-xs text-slate-400 hover:text-slate-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
