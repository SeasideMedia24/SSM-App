// Tests for normalize() — the Google-event → calendar-entry conversion. The
// key property: an event lands on the day it happens in the VIEWER's timezone,
// no matter what zone/offset Google returned the dateTime in. (The old code
// sliced the string raw, so events near midnight showed on the wrong day when
// Google didn't honour the timeZone request param.)

import { describe, it, expect } from 'vitest';
import { normalize, type RawEvent } from './calendar';

const cal = { id: 'cal1', summary: 'Calendar', color: null, merge_ssm: false };
const ET = 'America/New_York';
// July = EDT (UTC-4). Range wide enough that filtering never interferes.
const FIRST = '2026-07-01';
const LAST = '2026-07-31';

const timed = (startIso: string, endIso: string): RawEvent => ({
  id: 'ev1',
  status: 'confirmed',
  summary: 'Shoot',
  start: { dateTime: startIso },
  end: { dateTime: endIso },
});

describe('normalize — timed events are bucketed in the viewer timezone', () => {
  it('keeps an event returned already in viewer-zone wall clock (offset form)', () => {
    const [e] = normalize(timed('2026-07-21T14:00:00-04:00', '2026-07-21T15:00:00-04:00'), cal, FIRST, LAST, ET);
    expect(e.dayIso).toBe('2026-07-21');
    expect(e.startMin).toBe(14 * 60);
    expect(e.endMin).toBe(15 * 60);
    expect(e.timeLabel).toBe('2 PM');
  });

  it('converts an event Google returned in UTC to the same local slot', () => {
    // 18:00Z == 14:00 EDT — the raw slice would have said 18:00 on the grid.
    const [e] = normalize(timed('2026-07-21T18:00:00Z', '2026-07-21T19:00:00Z'), cal, FIRST, LAST, ET);
    expect(e.dayIso).toBe('2026-07-21');
    expect(e.startMin).toBe(14 * 60);
    expect(e.timeLabel).toBe('2 PM');
  });

  it('moves a near-midnight UTC event onto the correct LOCAL day', () => {
    // 02:30Z on the 22nd is 22:30 EDT on the 21st — the classic wrong-day bug.
    const [e] = normalize(timed('2026-07-22T02:30:00Z', '2026-07-22T03:30:00Z'), cal, FIRST, LAST, ET);
    expect(e.dayIso).toBe('2026-07-21');
    expect(e.startMin).toBe(22 * 60 + 30);
    expect(e.timeLabel).toBe('10:30 PM');
  });

  it('treats an end past local midnight as running to end-of-day', () => {
    // 23:00 → 01:00 next day (local): endMin clamps to 24:00 on the start day.
    const [e] = normalize(timed('2026-07-21T23:00:00-04:00', '2026-07-22T01:00:00-04:00'), cal, FIRST, LAST, ET);
    expect(e.dayIso).toBe('2026-07-21');
    expect(e.endMin).toBe(24 * 60);
  });

  it('drops events outside the displayed range after conversion', () => {
    // 01:00Z on Aug 1 = Jul 31 21:00 EDT — INSIDE the July range once converted.
    const inRange = normalize(timed('2026-08-01T01:00:00Z', '2026-08-01T02:00:00Z'), cal, FIRST, LAST, ET);
    expect(inRange).toHaveLength(1);
    expect(inRange[0].dayIso).toBe('2026-07-31');
    // Noon Aug 1 stays Aug 1 in ET — outside the range.
    const outOfRange = normalize(timed('2026-08-01T16:00:00Z', '2026-08-01T17:00:00Z'), cal, FIRST, LAST, ET);
    expect(outOfRange).toHaveLength(0);
  });
});

describe('normalize — all-day events (unchanged semantics)', () => {
  it('expands multi-day all-day events with EXCLUSIVE end date', () => {
    const ev: RawEvent = { id: 'ev2', status: 'confirmed', summary: 'Festival', start: { date: '2026-07-10' }, end: { date: '2026-07-12' } };
    const days = normalize(ev, cal, FIRST, LAST, ET).map((e) => e.dayIso);
    expect(days).toEqual(['2026-07-10', '2026-07-11']);
  });

  it('skips cancelled events', () => {
    const ev: RawEvent = { id: 'ev3', status: 'cancelled', summary: 'Gone', start: { date: '2026-07-10' } };
    expect(normalize(ev, cal, FIRST, LAST, ET)).toHaveLength(0);
  });
});
