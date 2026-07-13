'use client';

// PaePae, always one click away. A floating button pinned to the bottom-left
// corner on every owner page; clicking it opens the full chat in a panel right
// there, so PaePae is reachable 24/7 without leaving the page you're on.
//
// Hidden on the dedicated /paepae page (that page already IS the full chat) to
// avoid two chat panels at once.

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { PaePaeChat } from '@/components/paepae/chat';

export function PaepaeDock() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (pathname === '/paepae') return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start">
      {open && (
        // The chat fills this panel: [&>div]:!h-full overrides PaePaeChat's own
        // full-viewport height so it sits neatly inside the dock.
        <div className="mb-3 h-[72vh] w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-slate-200 [&>div]:!h-full [&>div]:!max-h-none">
          <PaePaeChat />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close PaePae' : 'Open PaePae'}
        aria-expanded={open}
        className="brand-gradient flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl shadow-deep/30 transition hover:brightness-110 active:scale-95"
      >
        {open ? (
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          // Spark — matches the sidebar's PaePae icon.
          <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c.4 3.2 1.8 4.6 5 5-3.2.4-4.6 1.8-5 5-.4-3.2-1.8-4.6-5-5 3.2-.4 4.6-1.8 5-5Z" />
            <path d="M19 13c.2 1.6.9 2.3 2.5 2.5-1.6.2-2.3.9-2.5 2.5-.2-1.6-.9-2.3-2.5-2.5 1.6-.2 2.3-.9 2.5-2.5Z" />
          </svg>
        )}
      </button>
    </div>
  );
}
