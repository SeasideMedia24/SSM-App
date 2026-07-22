'use client';

// "New message" — a dropdown of the people the viewer may DM (owner → team;
// team → owner + project teammates). Picking one opens/creates that DM via the
// start_dm RPC and navigates to it.

import { useState, useTransition } from 'react';
import { openDm } from '@/app/(app)/messages/actions';
import type { MessageableUser } from '@/lib/messages/queries';

export function NewMessageControl({ people, basePath }: { people: MessageableUser[]; basePath: '/messages' | '/my-messages' }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (people.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea"
      >
        New message
      </button>
      {open && (
        <>
          <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {people.map((p) => (
              <button
                key={p.userId}
                type="button"
                disabled={pending}
                onClick={() => { setOpen(false); start(() => openDm(p.userId, basePath)); }}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {p.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
