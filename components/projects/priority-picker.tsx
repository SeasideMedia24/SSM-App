'use client';

// A vertical 3-button priority stack: High (top) → Medium → Low (bottom).
//
// Two ways to use it:
//   • Form mode: pass `name` — it renders a hidden input so the choice submits.
//   • Live mode: pass `onChange` — clicking calls it (used on the project detail
//     to persist immediately). Both can be combined.

import { useState, useTransition } from 'react';
import { taskPriorityMeta } from '@/lib/projects/status';
import { setProjectPriority } from '@/app/(app)/projects/actions';
import type { TaskPriority } from '@/types/database.types';

// Top-to-bottom display order.
const ORDER: TaskPriority[] = ['high', 'medium', 'low'];

const ACTIVE: Record<TaskPriority, string> = {
  high: 'border-rose-300 bg-rose-50 text-rose-700',
  medium: 'border-sky-300 bg-sky-50 text-sky-700',
  low: 'border-slate-300 bg-slate-100 text-slate-700',
};

export function PriorityPicker({
  value,
  name,
  onChange,
}: {
  value: TaskPriority;
  name?: string;
  onChange?: (p: TaskPriority) => void;
}) {
  const [current, setCurrent] = useState<TaskPriority>(value);

  function pick(p: TaskPriority) {
    setCurrent(p);
    onChange?.(p);
  }

  return (
    <div className="inline-flex flex-col overflow-hidden rounded-xl border border-slate-200">
      {name && <input type="hidden" name={name} value={current} />}
      {ORDER.map((p) => {
        const on = current === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => pick(p)}
            aria-pressed={on}
            className={`w-28 border-b border-slate-200 px-3 py-1.5 text-sm font-medium transition-colors last:border-b-0 ${
              on ? ACTIVE[p] : 'bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            {taskPriorityMeta(p).label}
          </button>
        );
      })}
    </div>
  );
}

// Detail-page control: writes the change immediately via the server action.
export function ProjectPriorityControl({ projectId, value }: { projectId: string; value: TaskPriority }) {
  const [, start] = useTransition();
  return <PriorityPicker value={value} onChange={(p) => start(() => setProjectPriority(projectId, p))} />;
}
