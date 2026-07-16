// Pure slot generation for the client kickoff booking. Given the owner's busy
// intervals (from Google free/busy) and a working-hours config, produce the open
// meeting slots. No deps — unit-tested like lib/pricing.
//
// Times are handled as LOCAL wall-clock in the owner's timezone (what Google's
// event API wants) and converted to absolute UTC only to compare against busy
// intervals and "now". DST is handled via Intl (see zonedTimeToUtc).

export type BusyInterval = { start: string; end: string }; // ISO (UTC)
export type Slot = { start: string; end: string; startUtc: string }; // start/end: 'YYYY-MM-DDTHH:MM' local

export type SchedulingConfig = {
  timeZone: string; // IANA, e.g. 'America/New_York'
  workingDays: number[]; // 0=Sun … 6=Sat
  dayStartMin: number; // minutes from midnight, local
  dayEndMin: number;
  meetingMinutes: number;
  stepMinutes: number;
  minLeadHours: number; // earliest bookable relative to now
  horizonDays: number; // how far out to offer
};

// Defaults (editable in Settings later). The studio's home zone matches PaePae.
export const KICKOFF_CONFIG: SchedulingConfig = {
  timeZone: 'America/New_York',
  workingDays: [1, 2, 3, 4, 5],
  dayStartMin: 9 * 60,
  dayEndMin: 17 * 60,
  meetingMinutes: 45,
  stepMinutes: 30,
  minLeadHours: 24,
  horizonDays: 21,
};

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// The local calendar parts of an instant, in a timezone.
function localParts(date: Date, timeZone: string): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  };
}

// Convert a local wall-clock 'YYYY-MM-DDTHH:MM' in `timeZone` to a UTC instant.
export function zonedTimeToUtc(localWallClock: string, timeZone: string): Date {
  const asIfUtc = new Date(`${localWallClock}:00Z`);
  // What clock time does this instant show in the target zone vs UTC? The gap is
  // the zone's offset at that moment (DST-aware because Intl accounts for it).
  const inZone = new Date(asIfUtc.toLocaleString('en-US', { timeZone }));
  const inUtc = new Date(asIfUtc.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offset = inZone.getTime() - inUtc.getTime();
  return new Date(asIfUtc.getTime() - offset);
}

function overlaps(startMs: number, endMs: number, busy: [number, number][]): boolean {
  return busy.some(([bStart, bEnd]) => startMs < bEnd && endMs > bStart);
}

export function generateSlots(now: Date, busy: BusyInterval[], cfg: SchedulingConfig = KICKOFF_CONFIG): Slot[] {
  const earliestMs = now.getTime() + cfg.minLeadHours * 3600_000;
  const busyMs: [number, number][] = busy
    .map((b): [number, number] => [Date.parse(b.start), Date.parse(b.end)])
    .filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e));

  const slots: Slot[] = [];

  for (let dayOffset = 0; dayOffset <= cfg.horizonDays; dayOffset++) {
    const dayInstant = new Date(now.getTime() + dayOffset * 86_400_000);
    const { year, month, day, weekday } = localParts(dayInstant, cfg.timeZone);
    if (!cfg.workingDays.includes(weekday)) continue;

    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    for (let m = cfg.dayStartMin; m + cfg.meetingMinutes <= cfg.dayEndMin; m += cfg.stepMinutes) {
      const start = `${dateStr}T${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
      const endM = m + cfg.meetingMinutes;
      const end = `${dateStr}T${pad(Math.floor(endM / 60))}:${pad(endM % 60)}`;

      const startMs = zonedTimeToUtc(start, cfg.timeZone).getTime();
      const endMs = startMs + cfg.meetingMinutes * 60_000;
      if (startMs < earliestMs) continue;
      if (overlaps(startMs, endMs, busyMs)) continue;

      slots.push({ start, end, startUtc: new Date(startMs).toISOString() });
    }
  }

  return slots;
}
