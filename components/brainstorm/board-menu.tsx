'use client';

// The Brainstorming hub UI: four tabs (one per board kind), each listing its
// boards. Create a new board and open it, or multi-select up to 3 and open them
// side by side. Deliberately its own look — airy, canvas-adjacent.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createBoard, deleteBoard, type BoardKind } from '@/app/(canvas)/brainstorm/actions';

type Board = { id: string; kind: string; title: string; updated_at: string };

const TABS: { kind: BoardKind; label: string; blurb: string }[] = [
  { kind: 'storyboard', label: 'Storyboard', blurb: 'Frames, references, and the shape of each scene.' },
  { kind: 'shotlist', label: 'Shot list', blurb: 'Every setup — angles, lenses, coverage.' },
  { kind: 'brainstorm', label: 'Brainstorm', blurb: 'Loose ideas, moodboards, anything goes.' },
  { kind: 'storyline', label: 'Storyline', blurb: 'The narrative, laid out on a timeline.' },
];

export function BoardMenu({ boards }: { boards: Board[] }) {
  const router = useRouter();
  const [active, setActive] = useState<BoardKind>('storyboard');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const list = boards.filter((b) => b.kind === active);

  function create() {
    start(async () => {
      const { id } = await createBoard(active);
      router.push(`/brainstorm/${id}`);
    });
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  }
  function openSideBySide() {
    if (selected.size === 0) return;
    router.push(`/brainstorm/compare?ids=${[...selected].join(',')}`);
  }
  function remove(id: string) {
    start(async () => {
      await deleteBoard(id);
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-ink">Brainstorming</h1>
          <p className="mt-1 text-sm text-slate-500">Your open space to develop the story before production.</p>
        </div>
        <a href="/dashboard" className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:border-teal hover:text-sea">
          ← Back to app
        </a>
      </header>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.kind}
            type="button"
            onClick={() => { setActive(t.kind); setSelected(new Set()); }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${active === t.kind ? 'border-teal text-sea' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-slate-400">{TABS.find((t) => t.kind === active)?.blurb}</p>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button type="button" onClick={openSideBySide} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-teal hover:text-sea">
              Open {selected.size} side by side
            </button>
          )}
          <button type="button" onClick={create} disabled={pending} className="brand-gradient rounded-lg px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60">
            {pending ? 'Working…' : '+ New board'}
          </button>
        </div>
      </div>

      {/* Board grid */}
      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center">
          <p className="text-sm text-slate-500">No {TABS.find((t) => t.kind === active)?.label.toLowerCase()} boards yet — create your first.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <div key={b.id} className={`group relative rounded-2xl border bg-white p-5 shadow-sm transition-colors ${selected.has(b.id) ? 'border-teal' : 'border-slate-200 hover:border-teal/50'}`}>
              <label className="absolute right-3 top-3 flex cursor-pointer items-center">
                <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggleSelect(b.id)} className="h-4 w-4 accent-teal" aria-label={`Select ${b.title}`} />
              </label>
              <button type="button" onClick={() => router.push(`/brainstorm/${b.id}`)} className="block w-full text-left">
                <div className="flex h-24 items-center justify-center rounded-xl bg-[radial-gradient(circle,_#cbd5e1_1px,_transparent_1px)] [background-size:14px_14px]" />
                <p className="mt-3 truncate text-sm font-semibold text-ink">{b.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">Updated {new Date(b.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </button>
              <button type="button" onClick={() => remove(b.id)} disabled={pending} className="mt-2 text-xs text-slate-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
