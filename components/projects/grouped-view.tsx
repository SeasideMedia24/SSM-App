'use client';

// A cross-project view grouped into a box per project, with filter chips to show
// or hide projects and a per-project dropdown to fold each box away. Used by the
// Deliverables view. When a `setStatus` action is passed, each row gets an
// inline status picker so statuses can be changed straight from the overview.

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { taskStatusMeta, TASK_STATUSES } from '@/lib/projects/status';
import { fmtDate } from '@/lib/projects/format';
import type { TaskStatus } from '@/types/database.types';
import type { ProjectGroup } from '@/lib/projects/grouping';

type SetStatus = (id: string, projectId: string, status: TaskStatus) => void | Promise<void>;

export function GroupedByProject({
  groups,
  itemNoun,
  projectView,
  setStatus,
}: {
  groups: ProjectGroup[];
  itemNoun: string; // "deliverable"
  projectView: string; // ?view= param when linking into the project
  setStatus?: SetStatus; // when provided, rows get an inline status picker
}) {
  // Collapsed = folded via the per-box dropdown. (The project filter chips were
  // removed — the per-box fold is enough.)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <p className="py-4 text-sm text-slate-400">Nothing here yet.</p>
      ) : (
        groups.map((g) => {
          const open = !collapsed.has(g.id);
          return (
            <section key={g.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setCollapsed((prev) => toggle(prev, g.id))}
                  aria-expanded={open}
                  className="flex items-center gap-2 text-left"
                >
                  <svg
                    width={13}
                    height={13}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-slate-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                  <span className="font-medium text-ink">{g.title}</span>
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {g.items.length} {itemNoun}
                    {g.items.length === 1 ? '' : 's'}
                  </span>
                  <Link href={`/projects/${g.id}?view=${projectView}`} className="text-xs text-slate-400 hover:text-sea hover:underline">
                    Open
                  </Link>
                </div>
              </div>
              {open && (
                <ul className="divide-y divide-slate-100">
                  {g.items.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className={`text-ink ${it.status === 'done' ? 'text-slate-400 line-through' : ''}`}>{it.title}</span>
                      {setStatus ? (
                        <InlineStatus id={it.id} projectId={g.id} status={it.status} setStatus={setStatus} />
                      ) : (
                        <span className={`ml-auto rounded-md px-2 py-0.5 text-xs font-medium ${taskStatusMeta(it.status).pill}`}>
                          {taskStatusMeta(it.status).label}
                        </span>
                      )}
                      <span className="w-16 text-right text-[11px] text-slate-400">{fmtDate(it.date) ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

// Inline status picker that writes through the passed server action.
function InlineStatus({
  id,
  projectId,
  status,
  setStatus,
}: {
  id: string;
  projectId: string;
  status: TaskStatus;
  setStatus: SetStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Optimistic override so the picker reflects the choice immediately; falls
  // back to the server-provided status until the user changes it.
  const [optimistic, setOptimistic] = useState<TaskStatus | null>(null);
  const value = optimistic ?? status;

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as TaskStatus;
        setOptimistic(next);
        start(async () => {
          await setStatus(id, projectId, next);
          router.refresh();
        });
      }}
      aria-label="Status"
      className="ml-auto rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none focus:border-teal disabled:opacity-60"
    >
      {TASK_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
