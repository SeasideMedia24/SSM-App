'use client';

// Sub-tabs on the project detail page. The active view lives in ?view= so it's
// linkable and survives refresh. Overview and Tasks are built; the rest arrive
// in the next step (4.3).

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion } from 'motion/react';

export const PROJECT_VIEWS = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'deliverables', label: 'Deliverables' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'budget', label: 'Budget' },
] as const;

export function ViewSwitcher({ active }: { active: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function go(key: string) {
    const next = new URLSearchParams(params.toString());
    if (key === 'overview') next.delete('view');
    else next.set('view', key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
      {PROJECT_VIEWS.map((v) => {
        const on = active === v.key;
        return (
          <button
            key={v.key}
            onClick={() => go(v.key)}
            className={`relative whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors ${
              on ? 'text-ink' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {v.label}
            {on && (
              <motion.span
                layoutId="view-underline"
                className="brand-gradient absolute inset-x-2 -bottom-px h-0.5 rounded-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
