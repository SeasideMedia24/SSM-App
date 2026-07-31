'use client';

// A project's canvas boards — shared by the owner's project detail (Boards tab)
// and the team's My Work. Lists boards by kind and (when canEdit) creates a new
// one of a chosen kind, attached to this project, then opens it in the canvas.
// RLS is the real gate; canEdit just hides controls the viewer can't use.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBoard, deleteBoard, type BoardKind } from '@/app/(canvas)/brainstorm/actions';

export type ProjectBoard = { id: string; kind: string; title: string; updated_at: string };

const KINDS: { kind: BoardKind; label: string }[] = [
  { kind: 'storyboard', label: 'Storyboard' },
  { kind: 'shotlist', label: 'Shot list' },
  { kind: 'brainstorm', label: 'Brainstorm' },
  { kind: 'storyline', label: 'Storyline' },
];
const kindLabel = (k: string) => KINDS.find((x) => x.kind === k)?.label ?? k;

export function BoardsPanel({ projectId, boards, canEdit }: { projectId: string; boards: ProjectBoard[]; canEdit: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<BoardKind>('storyboard');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function create() {
    start(async () => {
      setError(null);
      try {
        const { id } = await createBoard(kind, undefined, projectId);
        router.push(`/brainstorm/${id}`);
      } catch {
        setError('Could not create the board.');
      }
    });
  }
  function remove(id: string) {
    start(async () => {
      await deleteBoard(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as BoardKind)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal"
            aria-label="Board kind"
          >
            {KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}
          </select>
          <button
            type="button"
            onClick={create}
            disabled={pending}
            className="brand-gradient rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
          >
            {pending ? 'Working…' : '+ New board'}
          </button>
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
        </div>
      )}

      {boards.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center text-sm text-slate-400">
          {canEdit ? 'No boards yet — create one to start planning this project.' : 'No boards on this project yet.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => (
            <div key={b.id} className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-teal/50">
              <button type="button" onClick={() => router.push(`/brainstorm/${b.id}`)} className="block w-full text-left">
                <div className="flex h-20 items-center justify-center rounded-xl bg-[radial-gradient(circle,_#cbd5e1_1px,_transparent_1px)] [background-size:14px_14px]" />
                <div className="mt-3 flex items-center gap-2">
                  <p className="flex-1 truncate text-sm font-semibold text-ink">{b.title}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{kindLabel(b.kind)}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">Updated {new Date(b.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </button>
              {canEdit && (
                <button type="button" onClick={() => remove(b.id)} disabled={pending} className="mt-2 text-xs text-slate-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100">
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
