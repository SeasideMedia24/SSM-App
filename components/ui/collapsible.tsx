'use client';

// A small labelled dropdown/disclosure. Click the header to hide or show its
// contents. Used for the Inquiries "Archived" section and anywhere a section
// should fold away for a clean workspace.

import { useState } from 'react';

export function Collapsible({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
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
        className="mb-2 flex w-full items-center gap-2 text-left"
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
        <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</span>
        {count != null && <span className="text-xs text-slate-400">· {count}</span>}
      </button>
      {open && children}
    </div>
  );
}
