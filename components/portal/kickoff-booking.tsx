'use client';

// The kickoff step in the client portal: pick an open slot (grouped by day) and
// book it. Times are shown in the studio's zone (ET) — the calendar invite the
// client receives will render in their own zone. Once booked, shows the
// confirmed time + Google Meet link.

import { useState, useTransition } from 'react';
import { bookKickoff } from '@/app/portal/[token]/actions';
import type { Slot } from '@/lib/scheduling/slots';

const pad = (n: number) => String(n).padStart(2, '0');

function dayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function timeLabel(local: string): string {
  const [, time] = local.split('T');
  const [h, min] = time.split(':').map(Number);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${pad(min)} ${h < 12 ? 'AM' : 'PM'}`;
}
function bookedLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) + ' ET';
}

export function KickoffBooking({
  token, slots, booked,
}: {
  token: string;
  slots: Slot[];
  booked: { at: string; link: string | null } | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(booked);

  if (confirmed) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-medium text-emerald-900">Your kickoff is booked 🎉</p>
        <p className="mt-1 text-sm text-emerald-800">{bookedLabel(confirmed.at)}</p>
        {confirmed.link && (
          <a href={confirmed.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-medium text-sea hover:underline">
            Join with Google Meet →
          </a>
        )}
        <p className="mt-2 text-xs text-emerald-700">A calendar invite is on its way to your inbox.</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No open times right now — we’ll reach out to find a slot that works. (Or email jeremy@seasidemedia.co.)
      </p>
    );
  }

  // Group by day, preserving order.
  const byDay = new Map<string, Slot[]>();
  for (const s of slots) {
    const day = s.start.split('T')[0];
    (byDay.get(day) ?? byDay.set(day, []).get(day)!).push(s);
  }

  function book(slotStart: string) {
    start(async () => {
      setError(null);
      const res = await bookKickoff(token, slotStart);
      if (res.ok) setConfirmed({ at: res.kickoffAt, link: res.meetLink });
      else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-400">Pick a time that works — shown in Eastern Time. 45 minutes.</p>
      <div className="flex flex-col gap-4">
        {[...byDay.entries()].map(([day, daySlots]) => (
          <div key={day}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{dayLabel(day)}</p>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  disabled={pending}
                  onClick={() => book(s.start)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-teal hover:bg-teal/5 hover:text-sea disabled:opacity-50"
                >
                  {timeLabel(s.start)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800">{error}</p>}
    </div>
  );
}
