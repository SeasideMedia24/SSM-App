// Dashboard calendar — a real calendar, Apple-style.
//
// Three views: Month (Sun–Sat grid, day number top-right), Week, and Day (an
// all-day strip plus a 12 AM → 11:59 PM time grid). Three sources as tabs:
//   Seaside Media  — the app's own schedule (tasks, deliverables, milestones,
//                    project due dates)
//   Personal       — Google Calendar events (whichever calendars are enabled
//                    in Settings, e.g. just "Home")
//   Everything     — both together
//
// Still a server component with zero client JS: view/source/date navigation is
// all plain links (?view=&src=&cal=).

import Link from 'next/link';
import {
  monthGrid,
  monthOf,
  weekDays,
  navAnchors,
  viewLabel,
  weekdayShort,
  type CalView,
  type CalSource,
} from '@/lib/dashboard/calendar';

export type CalendarItemKind = 'task' | 'deliverable' | 'milestone' | 'project' | 'gcal';

export type CalendarItem = {
  id: string;
  title: string;
  kind: CalendarItemKind;
  href: string;
  external?: boolean; // gcal items open Google Calendar in a new tab
  done?: boolean;
  // Timed events only (Google): minutes from midnight + a "7:05 PM" label.
  startMin?: number;
  endMin?: number;
  timeLabel?: string;
};

export type GoogleStatus = {
  status: 'ok' | 'disconnected' | 'unconfigured' | 'error';
  message?: string;
};

// One place to tune each kind's look (pills, timed blocks, legend dots).
const KIND_STYLE: Record<CalendarItemKind, { pill: string; block: string; dot: string; label: string }> = {
  task: { pill: 'bg-teal/10 text-sea', block: 'border-teal bg-teal/10 text-sea', dot: 'bg-teal', label: 'Task' },
  deliverable: { pill: 'bg-violet-100 text-violet-700', block: 'border-violet-400 bg-violet-100 text-violet-700', dot: 'bg-violet-400', label: 'Deliverable' },
  milestone: { pill: 'bg-amber-100 text-amber-700', block: 'border-amber-400 bg-amber-100 text-amber-700', dot: 'bg-amber-400', label: 'Milestone' },
  project: { pill: 'bg-sky-100 text-sky-700', block: 'border-sky-400 bg-sky-100 text-sky-700', dot: 'bg-sky-400', label: 'Project due' },
  gcal: { pill: 'bg-rose-100 text-rose-700', block: 'border-rose-400 bg-rose-100 text-rose-800', dot: 'bg-rose-400', label: 'Google Calendar' },
};

const SRC_TABS: { key: CalSource; label: string }[] = [
  { key: 'ssm', label: 'Seaside Media' },
  { key: 'personal', label: 'Personal' },
  { key: 'all', label: 'Everything' },
];

const VIEW_TABS: { key: CalView; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
];

const HOUR_PX = 44; // height of one hour row in the week/day time grid

export function CalendarBlock({
  view,
  src,
  anchor,
  todayIso,
  itemsByDay,
  google,
}: {
  view: CalView;
  src: CalSource;
  anchor: string;
  todayIso: string;
  itemsByDay: Record<string, CalendarItem[]>;
  google: GoogleStatus;
}) {
  const url = (v: CalView, s: CalSource, cal?: string) =>
    `/dashboard?view=${v}&src=${s}${cal ? `&cal=${cal}` : ''}`;
  const { prev, next } = navAnchors(view, anchor);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Row 1: title + source tabs */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Calendar</h2>
        <Segmented>
          {SRC_TABS.map((t) => (
            <SegLink key={t.key} href={url(view, t.key, anchor)} active={src === t.key}>
              {t.label}
            </SegLink>
          ))}
        </Segmented>
      </div>

      {/* Row 2: date nav + view tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <NavArrow href={url(view, src, prev)} label="Previous" dir="left" />
          <span className="min-w-44 text-center text-sm font-medium text-ink">{viewLabel(view, anchor)}</span>
          <NavArrow href={url(view, src, next)} label="Next" dir="right" />
          <Link
            href={url(view, src)}
            scroll={false}
            className="ml-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:border-teal hover:text-sea"
          >
            Today
          </Link>
        </div>
        <Segmented>
          {VIEW_TABS.map((t) => (
            <SegLink key={t.key} href={url(t.key, src, anchor)} active={view === t.key}>
              {t.label}
            </SegLink>
          ))}
        </Segmented>
      </div>

      {/* Google connection notice on the tabs that need it */}
      {src !== 'ssm' && google.status !== 'ok' && (
        <p className="mb-4 rounded-xl bg-aqua/10 px-3 py-2 text-sm text-sea">
          {google.status === 'error'
            ? (google.message ?? 'Could not reach Google Calendar right now.')
            : (
              <>
                Personal events come from Google Calendar —{' '}
                <Link href="/settings#google-calendar" className="font-medium underline">
                  connect it in Settings
                </Link>{' '}
                to see them here.
              </>
            )}
        </p>
      )}

      {view === 'month' ? (
        <MonthView anchor={anchor} todayIso={todayIso} itemsByDay={itemsByDay} />
      ) : (
        <TimeGridView days={view === 'day' ? [anchor] : weekDays(anchor)} todayIso={todayIso} itemsByDay={itemsByDay} />
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
        {(Object.keys(KIND_STYLE) as CalendarItemKind[])
          .filter((k) => (src === 'personal' ? k === 'gcal' : src === 'ssm' ? k !== 'gcal' : true))
          .map((kind) => (
            <span key={kind} className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${KIND_STYLE[kind].dot}`} />
              {KIND_STYLE[kind].label}
            </span>
          ))}
      </div>
    </section>
  );
}

// ── Month ────────────────────────────────────────────────────────────────────

const MAX_PER_DAY = 4;

function MonthView({
  anchor,
  todayIso,
  itemsByDay,
}: {
  anchor: string;
  todayIso: string;
  itemsByDay: Record<string, CalendarItem[]>;
}) {
  const weeks = monthGrid(monthOf(anchor));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <span key={d} className="py-1.5">{d}</span>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 divide-x divide-slate-100 border-b border-slate-100 last:border-b-0">
          {week.map((day) => {
            const items = itemsByDay[day.iso] ?? [];
            const isToday = day.iso === todayIso;
            return (
              <div key={day.iso} className={`min-h-28 p-1 ${day.inMonth ? 'bg-white' : 'bg-slate-50/70'}`}>
                {/* Day number, top-right like a traditional calendar */}
                <div className="flex justify-end">
                  <span
                    className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] ${
                      isToday
                        ? 'brand-gradient font-semibold text-white'
                        : day.inMonth
                          ? 'font-medium text-slate-600'
                          : 'text-slate-300'
                    }`}
                  >
                    {day.day}
                  </span>
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {items.slice(0, MAX_PER_DAY).map((item) => (
                    <Pill key={`${item.kind}-${item.id}-${day.iso}`} item={item} />
                  ))}
                  {items.length > MAX_PER_DAY && (
                    <p className="px-1 text-[10px] text-slate-400">+{items.length - MAX_PER_DAY} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Week / Day (all-day strip + time grid) ───────────────────────────────────

function TimeGridView({
  days,
  todayIso,
  itemsByDay,
}: {
  days: string[];
  todayIso: string;
  itemsByDay: Record<string, CalendarItem[]>;
}) {
  const allDayOf = (iso: string) => (itemsByDay[iso] ?? []).filter((i) => i.startMin == null);
  const timedOf = (iso: string) => (itemsByDay[iso] ?? []).filter((i) => i.startMin != null);
  const hasAllDay = days.some((d) => allDayOf(d).length > 0);
  const cols = { gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      {/* Column headers */}
      <div className="grid border-b border-slate-200 bg-slate-50" style={cols}>
        <span />
        {days.map((iso) => {
          const isToday = iso === todayIso;
          return (
            <div key={iso} className="border-l border-slate-100 py-1.5 text-center">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{weekdayShort(iso)}</span>{' '}
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] ${
                  isToday ? 'brand-gradient font-semibold text-white' : 'font-medium text-slate-600'
                }`}
              >
                {Number(iso.slice(8, 10))}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day strip (the app's dated items are all-day by nature) */}
      {hasAllDay && (
        <div className="grid border-b border-slate-200" style={cols}>
          <span className="py-1 pr-1 text-right text-[10px] uppercase text-slate-400">all-day</span>
          {days.map((iso) => (
            <div key={iso} className={`space-y-0.5 border-l border-slate-100 p-1 ${iso === todayIso ? 'bg-aqua/5' : ''}`}>
              {allDayOf(iso).map((item) => (
                <Pill key={`${item.kind}-${item.id}-${iso}`} item={item} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* The time grid: 12 AM → 11:59 PM */}
      <div className="max-h-[34rem] overflow-y-auto">
        <div className="grid" style={cols}>
          {/* Hour gutter */}
          <div>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="relative border-t border-transparent" style={{ height: HOUR_PX }}>
                <span className="absolute -top-2 right-1 text-[10px] text-slate-400">
                  {h === 0 ? '' : `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`}
                </span>
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((iso) => (
            <div
              key={iso}
              className={`relative border-l border-slate-100 ${iso === todayIso ? 'bg-aqua/5' : ''}`}
              style={{ height: HOUR_PX * 24 }}
            >
              {/* Hour lines */}
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="border-t border-slate-100" style={{ height: HOUR_PX }} />
              ))}
              {/* Timed events, absolutely positioned by start/duration */}
              {timedOf(iso).map((item) => {
                const top = ((item.startMin ?? 0) / 60) * HOUR_PX;
                const height = Math.max((((item.endMin ?? 0) - (item.startMin ?? 0)) / 60) * HOUR_PX, 18);
                const style = KIND_STYLE[item.kind];
                return (
                  <a
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    title={`${item.timeLabel ?? ''} ${item.title}`.trim()}
                    className={`absolute inset-x-0.5 overflow-hidden rounded border-l-2 px-1 py-0.5 text-[11px] leading-tight transition-opacity hover:opacity-75 ${style.block}`}
                    style={{ top, height }}
                  >
                    <span className="font-medium">{item.title}</span>
                    {item.timeLabel && <span className="ml-1 opacity-70">{item.timeLabel}</span>}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Shared bits ──────────────────────────────────────────────────────────────

// A compact event pill (month cells + the all-day strip). Timed Google events
// in the month view show their start time, Apple-style.
function Pill({ item }: { item: CalendarItem }) {
  const style = KIND_STYLE[item.kind];
  const label = item.timeLabel ? `${item.timeLabel} ${item.title}` : item.title;
  const cls = `block truncate rounded px-1.5 py-0.5 text-[11px] leading-4 transition-opacity hover:opacity-75 ${style.pill} ${
    item.done ? 'line-through opacity-50' : ''
  }`;
  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer" title={`${style.label}: ${item.title}`} className={cls}>
        {label}
      </a>
    );
  }
  return (
    <Link href={item.href} title={`${style.label}: ${item.title}`} className={cls}>
      {label}
    </Link>
  );
}

function Segmented({ children }: { children: React.ReactNode }) {
  return <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">{children}</div>;
}

function SegLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'
      }`}
    >
      {children}
    </Link>
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
