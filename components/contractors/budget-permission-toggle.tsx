'use client';

// Owner-only switch: may this contractor see the budget of the projects they're
// assigned to? Off by default and independent of clearance level — budget access
// is a deliberate, per-person grant (see supabase migration 20260723000004).

import { useState, useTransition } from 'react';
import { setContractorBudgetAccess } from '@/app/(app)/contractors/actions';

export function BudgetPermissionToggle({ contractorId, canSee }: { contractorId: string; canSee: boolean }) {
  const [on, setOn] = useState(canSee);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={on}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setOn(next); // optimistic; roll back on failure
            start(async () => {
              setError(null);
              const res = await setContractorBudgetAccess(contractorId, next);
              if (!res.ok) {
                setOn(!next);
                setError(res.message ?? 'Could not save.');
              }
            });
          }}
          className="h-4 w-4 rounded border-slate-300 text-sea focus:ring-teal disabled:opacity-60"
        />
        <span className="font-medium text-slate-700">Can see project budget</span>
      </label>
      <span className="text-xs text-slate-400">
        Off by default. When on, they can view the budget of the projects they’re assigned to — not your rate card or any other project.
      </span>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
