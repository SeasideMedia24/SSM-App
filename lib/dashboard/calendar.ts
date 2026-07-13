// Month-grid date math for the dashboard calendar block. Pure functions, all in
// UTC (the app stores dates as YYYY-MM-DD strings), so the grid can't drift
// with the server's timezone and is easy to unit test.

export type MonthRef = { year: number; month: number }; // month is 1–12

export type CalendarDay = {
  iso: string; // YYYY-MM-DD
  day: number; // 1–31
  inMonth: boolean; // false for the leading/trailing days that pad the grid
};

const pad = (n: number) => String(n).padStart(2, '0');

// Today's date (YYYY-MM-DD) in a given IANA timezone. en-CA formats as ISO, so
// "today" is correct for the viewer even late at night when UTC has rolled over.
export function todayInTz(tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function isoOf(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Parse ?cal=YYYY-MM. Anything missing or malformed falls back to the month of
// `todayIso`, so a hand-edited URL can never crash the dashboard.
export function parseMonthParam(param: string | undefined, todayIso: string): MonthRef {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const year = Number(param.slice(0, 4));
    const month = Number(param.slice(5, 7));
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) return { year, month };
  }
  return { year: Number(todayIso.slice(0, 4)), month: Number(todayIso.slice(5, 7)) };
}

export function monthParam({ year, month }: MonthRef): string {
  return `${year}-${pad(month)}`;
}

export function addMonths({ year, month }: MonthRef, delta: number): MonthRef {
  const zeroBased = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: ((zeroBased % 12) + 12) % 12 + 1 };
}

// "July 2026" — for the block header.
export function monthLabel({ year, month }: MonthRef): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// First and last day of the month as ISO strings — the query bounds.
export function monthBounds(ref: MonthRef): { first: string; last: string } {
  return {
    first: isoOf(ref.year, ref.month, 1),
    last: isoOf(ref.year, ref.month, daysInMonth(ref)),
  };
}

export function daysInMonth({ year, month }: MonthRef): number {
  // Day 0 of the NEXT month is this month's last day.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// ── Views (month / week / day) ───────────────────────────────────────────────

export type CalView = 'month' | 'week' | 'day';

export function parseView(v: string | undefined): CalView {
  return v === 'week' || v === 'day' ? v : 'month';
}

// Which calendar sources are hidden (?hide=key1,key2). Absent = show everything.
export function parseHidden(v: string | undefined): Set<string> {
  if (!v) return new Set();
  return new Set(v.split(',').map((s) => s.trim()).filter(Boolean));
}

export function hideParam(hidden: Set<string>): string {
  return [...hidden].join(',');
}

// The anchor is the date the view is centred on: ?cal=YYYY-MM-DD (a bare
// YYYY-MM is accepted and means the 1st of that month). Anything malformed
// falls back to today.
export function parseAnchor(param: string | undefined, todayIso: string): string {
  const candidate = param && /^\d{4}-\d{2}$/.test(param) ? `${param}-01` : param;
  if (candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    const d = new Date(`${candidate}T00:00:00Z`);
    // Round-trip check rejects impossible dates like 2026-02-31.
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === candidate) return candidate;
  }
  return todayIso;
}

export function monthOf(iso: string): MonthRef {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) };
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// Sunday-first week containing the anchor.
export function weekBounds(iso: string): { first: string; last: string } {
  const weekday = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const first = addDays(iso, -weekday);
  return { first, last: addDays(first, 6) };
}

export function weekDays(iso: string): string[] {
  const { first } = weekBounds(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

// The date range a view displays — also the DB query bounds.
export function rangeForView(view: CalView, anchor: string): { first: string; last: string } {
  if (view === 'day') return { first: anchor, last: anchor };
  if (view === 'week') return weekBounds(anchor);
  return monthBounds(monthOf(anchor));
}

// Where the ‹ › arrows land, per view.
export function navAnchors(view: CalView, anchor: string): { prev: string; next: string } {
  if (view === 'day') return { prev: addDays(anchor, -1), next: addDays(anchor, 1) };
  if (view === 'week') return { prev: addDays(anchor, -7), next: addDays(anchor, 7) };
  const ref = monthOf(anchor);
  const p = addMonths(ref, -1);
  const n = addMonths(ref, 1);
  return { prev: isoOf(p.year, p.month, 1), next: isoOf(n.year, n.month, 1) };
}

// Header label per view: "July 2026" · "Jul 5 – 11, 2026" · "Saturday, July 11, 2026".
export function viewLabel(view: CalView, anchor: string): string {
  if (view === 'month') return monthLabel(monthOf(anchor));
  const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);
  if (view === 'day') {
    return utc(anchor).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
  }
  const { first, last } = weekBounds(anchor);
  const f = utc(first);
  const l = utc(last);
  const fLabel = f.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  const lLabel = l.toLocaleDateString('en-US', {
    ...(f.getUTCMonth() === l.getUTCMonth() ? {} : { month: 'short' as const }),
    day: 'numeric', timeZone: 'UTC',
  });
  return `${fLabel} – ${lLabel}, ${l.getUTCFullYear()}`;
}

// Short weekday name for column headers ("Sun", "Mon", …).
export function weekdayShort(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
}

// The full grid: Sunday-first weeks covering the whole month (4–6 rows).
// Leading/trailing cells from the neighbouring months are marked inMonth:false.
export function monthGrid(ref: MonthRef): CalendarDay[][] {
  const firstWeekday = new Date(Date.UTC(ref.year, ref.month - 1, 1)).getUTCDay(); // 0 = Sunday
  const total = daysInMonth(ref);

  const weeks: CalendarDay[][] = [];
  let cursor = 1 - firstWeekday; // may start in the previous month
  while (cursor <= total) {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++, cursor++) {
      // Date.UTC normalizes out-of-range days into the neighbouring months.
      const d = new Date(Date.UTC(ref.year, ref.month - 1, cursor));
      week.push({
        iso: isoOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()),
        day: d.getUTCDate(),
        inMonth: cursor >= 1 && cursor <= total,
      });
    }
    weeks.push(week);
  }
  return weeks;
}
