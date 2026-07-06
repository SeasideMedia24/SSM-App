'use client';

// Archive / restore a project. Archiving is reversible (it just moves the
// project to the Archived column), so no destructive confirmation is needed.

import { useTransition } from 'react';
import { setProjectArchived } from '@/app/(app)/projects/actions';

export function ArchiveControl({ projectId, archived }: { projectId: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => setProjectArchived(projectId, !archived))}
      className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea disabled:opacity-60"
    >
      {pending ? '…' : archived ? 'Restore from archive' : 'Archive'}
    </button>
  );
}
