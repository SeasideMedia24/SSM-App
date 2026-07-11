import { describe, it, expect } from 'vitest';
import {
  parseMonthParam,
  monthParam,
  addMonths,
  monthBounds,
  daysInMonth,
  monthGrid,
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
