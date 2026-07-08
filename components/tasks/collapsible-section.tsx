'use client';

// A task status section (Not started / In progress / Done) with a foldable
// header. Used on My Tasks so the growing "Done" pile can be tucked away for a
// clean workspace. The list itself is server-rendered and passed as children.

import { useState } from 'react';

export function CollapsibleTaskSection({
  label,
  pill,
  count,
  defaultOpen = true,
  children,
}: {
  label: string;
  pill: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mb-2 flex items-center gap-2 rounded-md text-left"
      >
        <svg
          width={13}
          height={13}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-slate-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${pill}`}>{label}</span>
        <span className="text-xs text-slate-400">{count}</span>
      </button>
      {open && children}
    </div>
  );
}
