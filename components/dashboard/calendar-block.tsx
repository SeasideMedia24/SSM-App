// Dashboard calendar — a month grid plotting everything with a date: tasks,
// deliverables, milestones, and project due dates. Month navigation is plain
// links (?cal=YYYY-MM), so this stays a server component with zero client JS.
//
// Today this shows the app's own schedule; when the Google Calendar integration
// lands (Phase 3), external events join the same grid as another item kind.

import Link from 'next/link';
import { monthGrid, monthLabel, monthParam, addMonths, type MonthRef } from '@/lib/dashboard/calendar';

export type CalendarItemKind = 'task' | 'deliverable' | 'milestone' | 'project';

export type CalendarItem = {
  id: string;
  title: string;
  kind: CalendarItemKind;
  href: string;
  done?: boolean;
};

// One place to tune each kind's look (pill + legend dot).
const KIND_STYLE: Record<CalendarItemKind, { pill: string; dot: string; label: string }> = {
  task: { pill: 'bg-teal/10 text-sea', dot: 'bg-teal', label: 'Task' },
  deliverable: { pill: 'bg-violet-100 text-violet-700', dot: 'bg-violet-400', label: 'Deliverable' },
  milestone: { pill: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', label: 'Milestone' },
  project: { pill: 'bg-sky-100 text-sky-700', dot: 'bg-sky-400', label: 'Project due' },
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// How many item pills fit in a day cell before we collapse to "+N more".
const MAX_PER_DAY = 3;

export function CalendarBlock({
  month,
  todayIso,
  itemsByDay,
}: {
  month: MonthRef;
  todayIso: string;
  itemsByDay: Record<string, CalendarItem[]>;
}) {
  const weeks = monthGrid(month);
  const prev = monthParam(addMonths(month, -1));
  const next = monthParam(addMonths(month, 1));

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header: title + month nav */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Calendar</h2>
        <div className="flex items-center gap-1">
          <NavArrow href={`/dashboard?cal=${prev}`} label="Previous month" dir="left" />
          <span className="min-w-36 text-center text-sm font-medium text-ink">{monthLabel(month)}</span>
          <NavArrow href={`/dashboard?cal=${next}`} label="Next month" dir="right" />
          <Link
            href="/dashboard"
            scroll={false}
            className="ml-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-teal hover:text-sea"
          >
            Today
          </Link>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-slate-200 pb-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>

      {/* The grid */}
      <div className="divide-y divide-slate-100">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 divide-x divide-slate-100">
            {week.map((day) => {
              const items = itemsByDay[day.iso] ?? [];
              const isToday = day.iso === todayIso;
              return (
                <div
                  key={day.iso}
                  className={`min-h-24 px-1 py-1.5 ${day.inMonth ? '' : 'bg-slate-50/60'}`}
                >
                  <span
                    className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                      isToday
                        ? 'brand-gradient font-semibold text-white'
                        : day.inMonth
                          ? 'text-slate-600'
                          : 'text-slate-300'
                    }`}
                  >
                    {day.day}
                  </span>
                  <div className="space-y-0.5">
                    {items.slice(0, MAX_PER_DAY).map((item) => {
                      const style = KIND_STYLE[item.kind];
                      return (
                        <Link
                          key={`${item.kind}-${item.id}`}
                          href={item.href}
                          title={`${style.label}: ${item.title}`}
                          className={`block truncate rounded px-1.5 py-0.5 text-[11px] leading-4 transition-opacity hover:opacity-75 ${style.pill} ${
                            item.done ? 'line-through opacity-50' : ''
                          }`}
                        >
                          {item.title}
                        </Link>
                      );
                    })}
                    {items.length > MAX_PER_DAY && (
                      <p className="px-1.5 text-[10px] text-slate-400">+{items.length - MAX_PER_DAY} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
        {(Object.keys(KIND_STYLE) as CalendarItemKind[]).map((kind) => (
          <span key={kind} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${KIND_STYLE[kind].dot}`} />
            {KIND_STYLE[kind].label}
          </span>
        ))}
      </div>
    </section>
  );
}

function NavArrow({ href, label, dir }: { href: string; label: string; dir: 'left' | 'right' }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-label={label}
      className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink"
    >
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {dir === 'left' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </Link>
  );
}
