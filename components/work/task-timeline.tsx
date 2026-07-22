// A compact schedule for the team home: the member's open assigned tasks laid
// out on a week-by-week timeline. Rows are priority (High on top → Low), so
// what matters most literally sits highest. Overdue tasks pin to a red leading
// column; undated tasks are omitted (nothing to place). Pure layout — the tasks
// are already loaded by the My Work page.

import Link from 'next/link';
import type { TaskPriority } from '@/types/database.types';

export type TimelineTask = { id: string; title: string; due_date: string | null; priority: TaskPriority };

const WEEKS = 6;
const PRIORITY_ROWS: { key: TaskPriority; label: string; dot: string }[] = [
  { key: 'high', label: 'High', dot: 'bg-rose-500' },
  { key: 'medium', label: 'Medium', dot: 'bg-sky-500' },
  { key: 'low', label: 'Low', dot: 'bg-slate-400' },
];

// Monday of the week containing `d` (local).
function weekStart(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const label = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export function TaskTimeline({ tasks }: { tasks: TimelineTask[] }) {
  const dated = tasks.filter((t) => t.due_date);
  if (dated.length === 0) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayIso = iso(today);
  const w0 = weekStart(today);
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = addDays(w0, i * 7);
    return { start, end: addDays(start, 7), startIso: iso(start), endIso: iso(addDays(start, 7)) };
  });
  // Bucket: overdue (< today) | week index | beyond horizon (dropped into last week)
  function bucketOf(due: string): number | 'overdue' {
    if (due < todayIso) return 'overdue';
    for (let i = 0; i < weeks.length; i++) if (due < weeks[i].endIso) return i;
    return weeks.length - 1; // clamp far-future into the last visible week
  }
  const anyOverdue = dated.some((t) => t.due_date! < todayIso);

  const cell = (priority: TaskPriority, bucket: number | 'overdue') =>
    dated.filter((t) => t.priority === priority && bucketOf(t.due_date!) === bucket);

  const columns: (number | 'overdue')[] = anyOverdue ? ['overdue', ...weeks.map((_, i) => i)] : weeks.map((_, i) => i);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-ink">Your timeline</h2>
      <p className="mb-3 text-xs text-slate-400">Open tasks by week · highest priority on top{dated.some((t) => t.due_date! === todayIso) ? ' · today highlighted' : ''}.</p>
      <div className="overflow-x-auto">
        <div className="min-w-[42rem]">
          {/* Header */}
          <div className="flex border-b border-slate-100 pb-1 text-[11px] font-medium text-slate-400">
            <div className="w-16 shrink-0" />
            {columns.map((c) => (
              <div key={String(c)} className={`flex-1 px-1 text-center ${c === 'overdue' ? 'text-rose-500' : weeks[c as number].startIso <= todayIso && todayIso < weeks[c as number].endIso ? 'font-semibold text-sea' : ''}`}>
                {c === 'overdue' ? 'Overdue' : label(weeks[c as number].start)}
              </div>
            ))}
          </div>
          {/* Priority rows */}
          {PRIORITY_ROWS.map((row) => (
            <div key={row.key} className="flex items-stretch border-b border-slate-50 last:border-0">
              <div className="flex w-16 shrink-0 items-center gap-1.5 py-2 text-xs text-slate-500">
                <span className={`h-2 w-2 rounded-full ${row.dot}`} />{row.label}
              </div>
              {columns.map((c) => {
                const items = cell(row.key, c);
                return (
                  <div key={String(c)} className="flex-1 space-y-1 px-1 py-2">
                    {items.map((t) => (
                      <Link
                        key={t.id}
                        href="/my-work"
                        className={`block truncate rounded-md px-2 py-1 text-[11px] ${c === 'overdue' ? 'bg-rose-50 text-rose-700' : 'bg-teal/10 text-sea'}`}
                        title={`${t.title}${t.due_date ? ` · due ${label(new Date(t.due_date + 'T00:00:00'))}` : ''}`}
                      >
                        {t.title}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
