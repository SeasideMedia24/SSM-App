import { describe, it, expect } from 'vitest';
import {
  parseMonthParam,
  monthParam,
  addMonths,
  monthBounds,
  daysInMonth,
  monthGrid,
  parseAnchor,
  parseView,
  parseHidden,
  hideParam,
  addDays,
  weekBounds,
  weekDays,
  rangeForView,
  navAnchors,
  viewLabel,
} from './calendar';

const TODAY = '2026-07-11';

describe('parseMonthParam', () => {
  it('accepts a valid YYYY-MM', () => {
    expect(parseMonthParam('2026-03', TODAY)).toEqual({ year: 2026, month: 3 });
  });

  it('falls back to the current month on garbage', () => {
    for (const bad of [undefined, '', 'nope', '2026-13', '2026-00', '1990-055', '99999-01']) {
      expect(parseMonthParam(bad, TODAY)).toEqual({ year: 2026, month: 7 });
    }
  });

  it('round-trips through monthParam', () => {
    expect(monthParam(parseMonthParam('2025-12', TODAY))).toBe('2025-12');
  });
});

describe('addMonths', () => {
  it('moves forward across a year boundary', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('moves backward across a year boundary', () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it('stays put with delta 0', () => {
    expect(addMonths({ year: 2026, month: 7 }, 0)).toEqual({ year: 2026, month: 7 });
  });
});

describe('monthBounds / daysInMonth', () => {
  it('handles a 31-day month', () => {
    expect(monthBounds({ year: 2026, month: 7 })).toEqual({ first: '2026-07-01', last: '2026-07-31' });
  });

  it('handles February in a leap year', () => {
    expect(daysInMonth({ year: 2024, month: 2 })).toBe(29);
    expect(monthBounds({ year: 2024, month: 2 }).last).toBe('2024-02-29');
  });

  it('handles February in a non-leap year', () => {
    expect(monthBounds({ year: 2026, month: 2 }).last).toBe('2026-02-28');
  });
});

describe('monthGrid', () => {
  it('builds Sunday-first full weeks covering July 2026', () => {
    const weeks = monthGrid({ year: 2026, month: 7 });
    // July 1, 2026 is a Wednesday → grid runs Sun Jun 28 … Sat Aug 1 (5 weeks).
    expect(weeks).toHaveLength(5);
    for (const w of weeks) expect(w).toHaveLength(7);
    expect(weeks[0][0].iso).toBe('2026-06-28');
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks[4][6].iso).toBe('2026-08-01');
    expect(weeks[4][6].inMonth).toBe(false);
  });

  it('marks exactly the days of the month as inMonth', () => {
    const weeks = monthGrid({ year: 2026, month: 7 });
    const inMonth = weeks.flat().filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].iso).toBe('2026-07-01');
    expect(inMonth[30].iso).toBe('2026-07-31');
  });

  it('handles a month starting on Sunday with no leading pad', () => {
    // March 2026 starts on a Sunday.
    const weeks = monthGrid({ year: 2026, month: 3 });
    expect(weeks[0][0]).toMatchObject({ iso: '2026-03-01', inMonth: true });
  });
});

describe('parseAnchor / parseView / hidden-source filter', () => {
  it('accepts a full date and a bare month', () => {
    expect(parseAnchor('2026-03-15', TODAY)).toBe('2026-03-15');
    expect(parseAnchor('2026-03', TODAY)).toBe('2026-03-01');
  });

  it('rejects impossible dates and garbage', () => {
    for (const bad of [undefined, '', '2026-02-31', '2026-13-01', 'soon']) {
      expect(parseAnchor(bad, TODAY)).toBe(TODAY);
    }
  });

  it('defaults view safely', () => {
    expect(parseView('week')).toBe('week');
    expect(parseView('nope')).toBe('month');
  });

  it('parses the hidden-source list and round-trips it', () => {
    expect(parseHidden(undefined)).toEqual(new Set()); // absent = show everything
    expect(parseHidden('ssm,cal_abc')).toEqual(new Set(['ssm', 'cal_abc']));
    expect(parseHidden(' ssm , , cal_abc ')).toEqual(new Set(['ssm', 'cal_abc']));
    expect(hideParam(new Set(['ssm', 'cal_abc']))).toBe('ssm,cal_abc');
    expect(hideParam(new Set())).toBe('');
  });
});

describe('week math', () => {
  it('finds the Sunday-first week containing a Saturday', () => {
    // 2026-07-11 is a Saturday.
    expect(weekBounds('2026-07-11')).toEqual({ first: '2026-07-05', last: '2026-07-11' });
  });

  it('is a no-op shift for a Sunday anchor', () => {
    expect(weekBounds('2026-03-01').first).toBe('2026-03-01');
  });

  it('lists seven consecutive days', () => {
    const days = weekDays('2026-07-11');
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-07-05');
    expect(days[6]).toBe('2026-07-11');
  });

  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('rangeForView / navAnchors / viewLabel', () => {
  it('month range covers the anchor month', () => {
    expect(rangeForView('month', '2026-07-11')).toEqual({ first: '2026-07-01', last: '2026-07-31' });
  });

  it('week and day ranges are tight', () => {
    expect(rangeForView('week', '2026-07-11')).toEqual({ first: '2026-07-05', last: '2026-07-11' });
    expect(rangeForView('day', '2026-07-11')).toEqual({ first: '2026-07-11', last: '2026-07-11' });
  });

  it('navigates by month, week, and day', () => {
    expect(navAnchors('month', '2026-07-11')).toEqual({ prev: '2026-06-01', next: '2026-08-01' });
    expect(navAnchors('week', '2026-07-11')).toEqual({ prev: '2026-07-04', next: '2026-07-18' });
    expect(navAnchors('day', '2026-07-11')).toEqual({ prev: '2026-07-10', next: '2026-07-12' });
  });

  it('labels each view', () => {
    expect(viewLabel('month', '2026-07-11')).toBe('July 2026');
    expect(viewLabel('week', '2026-07-11')).toBe('Jul 5 – 11, 2026');
    expect(viewLabel('week', '2026-07-01')).toBe('Jun 28 – Jul 4, 2026');
    expect(viewLabel('day', '2026-07-11')).toBe('Saturday, July 11, 2026');
  });
});
