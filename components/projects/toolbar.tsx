'use client';

// Board/List view toggle + PARA-category filter for the Projects page.
// State lives in the URL (?view=&para=) so it survives refresh and is shareable.

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PROJECT_TAGS } from '@/lib/projects/tags';

const PARA_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'project', label: 'Projects' },
  { value: 'area', label: 'Areas' },
  { value: 'resource', label: 'Resources' },
  { value: 'archive', label: 'Archive' },
];

export function ProjectsToolbar({ view, para, tags }: { view: 'board' | 'list'; para: string; tags: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  }

  // Stack/unstack a tag in the ?tags=a,b filter.
  function toggleTag(tag: string) {
    const set = new Set(tags);
    if (set.has(tag)) set.delete(tag);
    else set.add(tag);
    setParam('tags', [...set].join(','));
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center gap-3">
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

        {tags.length > 0 && (
          <button onClick={() => setParam('tags', '')} className="text-xs text-slate-400 hover:text-slate-700">
            Clear tags
          </button>
        )}
      </div>

      {/* Stackable tag filter — click to narrow to projects with any selected tag */}
      <div className="flex flex-wrap gap-1.5">
        {PROJECT_TAGS.map((tag) => {
          const on = tags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              aria-pressed={on}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                on ? 'border-teal bg-teal/10 text-sea' : 'border-slate-200 bg-white text-slate-500 hover:border-teal/60'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
