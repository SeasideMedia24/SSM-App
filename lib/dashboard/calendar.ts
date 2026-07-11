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
