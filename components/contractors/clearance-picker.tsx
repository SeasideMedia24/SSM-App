'use client';

// Clearance pickers (owner-side). Two flavours:
//   <ClearancePicker>            — the person's DEFAULT level (contractor page)
//   <AssignmentClearancePicker>  — a per-project override ("Default" = inherit)

import { useState, useTransition } from 'react';
import { setContractorClearance, setAssignmentClearance } from '@/app/(app)/contractors/actions';
import { CLEARANCE_LEVELS, clearanceMeta } from '@/lib/auth/clearance';

export function ClearancePicker({ contractorId, level }: { contractorId: string; level: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const meta = clearanceMeta(level);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Clearance</span>
        <select
          value={level}
          disabled={pending}
          onChange={(e) =>
            start(async () => {
              setError(null);
              const res = await setContractorClearance(contractorId, Number(e.target.value));
              if (!res.ok) setError(res.message ?? 'Could not save.');
            })
          }
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-teal disabled:opacity-60"
          aria-label="Default clearance level"
        >
          {CLEARANCE_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{meta.blurb}</span>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function AssignmentClearancePicker({
  assignmentId,
  contractorId,
  override,
  personDefault,
}: {
  assignmentId: string;
  contractorId: string;
  override: number | null;
  personDefault: number;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-1">
      <select
        value={override ?? 0}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            setError(null);
            const v = Number(e.target.value);
            const res = await setAssignmentClearance(assignmentId, contractorId, v === 0 ? null : v);
            if (!res.ok) setError(res.message ?? 'Could not save.');
          })
        }
        className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none focus:border-teal disabled:opacity-60"
        aria-label="Clearance on this project"
        title="Clearance on this project (Default = the person's overall level)"
      >
        <option value={0}>Default (L{personDefault})</option>
        {CLEARANCE_LEVELS.map((l) => (
          <option key={l.value} value={l.value}>L{l.value}</option>
        ))}
      </select>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </span>
  );
}
