'use client';

// Per-project Budget view.
//
// A project can carry several quotes (every save stacks a new one). This shows
// the latest by default in a dropdown, and you can switch to any past quote to
// see its cost / charge / margin. When there's more than one, a line reports the
// combined charge across all of them. Each quote opens back in the calculator.

import Link from 'next/link';
import { useState } from 'react';
import { money } from '@/lib/projects/format';
import { quoteStatusMeta } from '@/lib/projects/status';
import type { QuoteBudgetRow } from '@/lib/projects/budget';

// created_at is a full timestamp, so format it directly (fmtDate is for
// date-only columns like due dates).
const fmtCreated = (ts: string) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function QuoteBudget({ rows }: { rows: QuoteBudgetRow[] }) {
  // rows arrive newest-first, so index 0 is the latest quote.
  const [sel, setSel] = useState(0);

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-10 text-center text-sm text-slate-400">
        No quotes linked to this project yet. Build one in the{' '}
        <Link href="/calculator" className="text-sea underline">Price Calculator</Link> and pick this project.
      </p>
    );
  }

  const cur = rows[Math.min(sel, rows.length - 1)];
  const meta = quoteStatusMeta(cur.status);
  const combinedCharge = rows.reduce((sum, r) => sum + r.charge, 0);

  return (
    <div className="space-y-5">
      {/* Quote picker + combined total */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-600">Quote</span>
          <select
            value={sel}
            onChange={(e) => setSel(Number(e.target.value))}
            className="min-w-[15rem] max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal"
          >
            {rows.map((r, i) => (
              <option key={r.id} value={i}>
                {r.title} · {fmtCreated(r.createdAt)}{i === 0 ? ' (latest)' : ''}
              </option>
            ))}
          </select>
        </label>
        {rows.length > 1 && (
          <p className="text-xs text-slate-500">
            {rows.length} quotes on this project · combined charge{' '}
            <span className="font-semibold text-slate-700">{money(combinedCharge)}</span>
          </p>
        )}
      </div>

      {/* Selected quote: the cost / charge / margin cards */}
      <div className="grid grid-cols-3 gap-3">
        <Roll label="Cost" value={cur.cost != null ? money(cur.cost) : '—'} />
        <Roll label="Charge" value={money(cur.charge)} />
        <Roll
          label="Margin"
          value={cur.margin != null ? money(cur.margin) : '—'}
          accent={cur.margin == null ? undefined : cur.margin < 0 ? 'neg' : 'pos'}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>{meta.label}</span>
        <Link href={`/calculator?quote=${cur.id}`} className="font-medium text-sea hover:underline">
          Open “{cur.title}” in the calculator →
        </Link>
      </div>
    </div>
  );
}

function Roll({ label, value, accent }: { label: string; value: string; accent?: 'pos' | 'neg' }) {
  const color = accent === 'neg' ? 'text-red-600' : accent === 'pos' ? 'text-green-700' : 'text-ink';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
