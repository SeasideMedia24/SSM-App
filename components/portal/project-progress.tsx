// Client-facing progress for the portal home: where the project stands
// (stepper across the production stages) and the timeline (milestones +
// deliverable due dates). Read-only — the client sees status, never edits it.

import { PROJECT_STATUSES } from '@/lib/projects/status';
import { fmtDate } from '@/lib/projects/format';
import type { ProjectStatus, TaskStatus } from '@/types/database.types';

// The stages a client should see (archived is internal housekeeping).
const CLIENT_STAGES = PROJECT_STATUSES.filter((s) => s.value !== 'archived');

export function ProgressStepper({ status }: { status: ProjectStatus }) {
  const currentIdx = CLIENT_STAGES.findIndex((s) => s.value === status);
  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {CLIENT_STAGES.map((s, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <li key={s.value} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done ? 'bg-teal text-white' : current ? `${s.bar} text-white` : 'bg-slate-100 text-slate-400'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-xs ${current ? 'font-semibold text-ink' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </div>
            {i < CLIENT_STAGES.length - 1 && <span className="mx-2 hidden h-px w-5 bg-slate-200 sm:block" />}
          </li>
        );
      })}
    </ol>
  );
}

export type TimelineEntry = {
  title: string;
  date: string | null; // ISO date
  status: TaskStatus;
  kind: 'milestone' | 'deliverable';
};

// Milestones + deliverables merged into one dated timeline, soonest first
// (undated entries sink to the bottom in their given order).
export function ProjectTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">The timeline will appear here once we lock dates at the kickoff.</p>;
  }
  const sorted = [...entries].sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });
  return (
    <ol className="relative ml-2 flex flex-col gap-4 border-l border-slate-200 pl-5">
      {sorted.map((e, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
              e.status === 'done' ? 'bg-teal' : e.status === 'in_progress' ? 'bg-amber-400' : 'bg-slate-300'
            }`}
          />
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className={`text-sm ${e.status === 'done' ? 'text-slate-400 line-through' : 'text-ink'}`}>{e.title}</p>
            <span className="text-[10px] uppercase tracking-wide text-slate-400">{e.kind}</span>
          </div>
          <p className="text-xs text-slate-500">
            {e.date ? fmtDate(e.date) : 'Date TBD'}
            {e.status === 'done' && ' · done'}
            {e.status === 'in_progress' && ' · in progress'}
          </p>
        </li>
      ))}
    </ol>
  );
}
