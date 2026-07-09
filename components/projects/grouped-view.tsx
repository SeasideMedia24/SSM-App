'use client';

// A cross-project view grouped into a box per project, with filter chips to show
// or hide individual projects. Used by the Timeline (milestones) and
// Deliverables views so items are organised by project instead of one long list.

import Link from 'next/link';
import { useState } from 'react';
import { taskStatusMeta } from '@/lib/projects/status';
import { fmtDate } from '@/lib/projects/format';
import type { ProjectGroup } from '@/lib/projects/grouping';

export function GroupedByProject({
  groups,
  itemNoun,
  projectView,
}: {
  groups: ProjectGroup[];
  itemNoun: string; // "milestone" | "deliverable"
  projectView: string; // ?view= param when linking into the project
}) {
  // Track which projects are hidden (all shown by default).
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const visible = groups.filter((g) => !hidden.has(g.id));

  return (
    <div className="space-y-4">
      {/* Filter chips — click to hide/show a project. */}
      {groups.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => {
            const on = !hidden.has(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggle(g.id)}
                aria-pressed={on}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  on ? 'border-teal bg-teal/10 text-sea' : 'border-slate-200 text-slate-400 hover:text-slate-600'
                }`}
              >
                {g.title}
              </button>
            );
          })}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-4 text-sm text-slate-400">No projects selected — pick one above.</p>
      ) : (
        visible.map((g) => (
          <section key={g.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <Link href={`/projects/${g.id}?view=${projectView}`} className="font-medium text-ink hover:text-sea hover:underline">
                {g.title}
              </Link>
              <span className="text-xs text-slate-400">
                {g.items.length} {itemNoun}
                {g.items.length === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {g.items.map((it) => {
                const meta = taskStatusMeta(it.status);
                return (
                  <li key={it.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="text-ink">{it.title}</span>
                    <span className={`ml-auto rounded-md px-2 py-0.5 text-xs font-medium ${meta.pill}`}>{meta.label}</span>
                    <span className="w-16 text-right text-[11px] text-slate-400">{fmtDate(it.date) ?? '—'}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
