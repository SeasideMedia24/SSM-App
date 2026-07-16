import { describe, it, expect } from 'vitest';
import { generateSlots, zonedTimeToUtc, type SchedulingConfig } from './slots';

// UTC config makes local wall-clock == UTC, so assertions are deterministic.
const base: SchedulingConfig = {
  timeZone: 'UTC',
  workingDays: [0, 1, 2, 3, 4, 5, 6],
  dayStartMin: 9 * 60,
  dayEndMin: 12 * 60,
  meetingMinutes: 60,
  stepMinutes: 60,
  minLeadHours: 0,
  horizonDays: 0,
};

const NOW = new Date('2026-07-20T00:00:00Z');

describe('generateSlots', () => {
  it('lays out slots across the working window, respecting meeting length', () => {
    const slots = generateSlots(NOW, [], base);
    expect(slots.map((s) => s.start)).toEqual([
      '2026-07-20T09:00',
      '2026-07-20T10:00',
      '2026-07-20T11:00',
    ]); // 11:00–12:00 fits; a 12:00 start would run past 12:00, excluded
  });

  it('excludes slots that overlap a busy interval', () => {
    const slots = generateSlots(NOW, [{ start: '2026-07-20T10:00:00Z', end: '2026-07-20T11:00:00Z' }], base);
    expect(slots.map((s) => s.start)).toEqual(['2026-07-20T09:00', '2026-07-20T11:00']);
  });

  it('offers only working days', () => {
    const slots = generateSlots(NOW, [], { ...base, workingDays: [1], horizonDays: 7 });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => new Date(s.startUtc).getUTCDay() === 1)).toBe(true);
  });

  it('honours the minimum lead time', () => {
    const slots = generateSlots(NOW, [], { ...base, minLeadHours: 24, horizonDays: 1 });
    // Everything on the 20th is <24h out; only the 21st qualifies.
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.start.startsWith('2026-07-21'))).toBe(true);
  });
});

describe('zonedTimeToUtc', () => {
  it('applies the DST offset (New York is UTC-4 in July)', () => {
    expect(zonedTimeToUtc('2026-07-20T09:00', 'America/New_York').toISOString()).toBe('2026-07-20T13:00:00.000Z');
  });

  it('applies the standard-time offset (New York is UTC-5 in January)', () => {
    expect(zonedTimeToUtc('2026-01-20T09:00', 'America/New_York').toISOString()).toBe('2026-01-20T14:00:00.000Z');
  });
});
