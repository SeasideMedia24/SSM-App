'use client';

// App-wide undo (⌘Z / Ctrl+Z) — v1.
//
// Quick mutations (board drags, status flips, priority changes) register an
// "inverse action" here as they run. Pressing ⌘Z — or clicking the toast's
// Undo button — pops the most recent one and executes it, then refreshes the
// server-rendered data. The stack is per-tab and in-memory: it resets on a
// page reload, which is the right scope for "oops, wrong column".
//
// To make something undoable: const undo = useUndo();
//   undo.register({ label: 'Moved “X” to Editing', undo: () => moveBack() });
// The undo callback should both call the server action AND revert any local
// optimistic state (close over the setter).
//
// Deliberately NOT undoable in v1: deletes (they have their own confirm step)
// and anything PaePae does (her receipts are the record; reversing those is a
// conversation with her).

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type UndoEntry = { label: string; undo: () => Promise<unknown> | unknown };

type UndoApi = { register: (entry: UndoEntry) => void };

const UndoContext = createContext<UndoApi>({ register: () => {} });

export function useUndo(): UndoApi {
  return useContext(UndoContext);
}

const TOAST_MS = 6000;
const MAX_STACK = 20;

export function UndoProvider({ children }: { children: React.ReactNode }) {
  const stack = useRef<UndoEntry[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ text: string; canUndo: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const showToast = useCallback((text: string, canUndo: boolean) => {
    setToast({ text, canUndo });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const register = useCallback(
    (entry: UndoEntry) => {
      stack.current.push(entry);
      if (stack.current.length > MAX_STACK) stack.current.shift();
      showToast(entry.label, true);
    },
    [showToast],
  );

  const undoLast = useCallback(async () => {
    const entry = stack.current.pop();
    if (!entry) return;
    setBusy(true);
    try {
      await entry.undo();
      showToast(`Undone: ${entry.label}`, false);
      router.refresh();
    } catch {
      showToast('Couldn’t undo that — check the page and adjust by hand.', false);
    } finally {
      setBusy(false);
    }
  }, [router, showToast]);

  // Global ⌘Z / Ctrl+Z — but never while typing (the browser's text undo wins).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.key.toLowerCase() !== 'z') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (stack.current.length === 0) return;
      e.preventDefault();
      void undoLast();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undoLast]);

  return (
    <UndoContext.Provider value={{ register }}>
      {children}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-900/95 px-4 py-2.5 text-sm text-white shadow-xl">
          <span className="max-w-md truncate">{toast.text}</span>
          {toast.canUndo && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void undoLast()}
              className="rounded-lg bg-white/15 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/25 disabled:opacity-60"
            >
              {busy ? 'Undoing…' : 'Undo ⌘Z'}
            </button>
          )}
        </div>
      )}
    </UndoContext.Provider>
  );
}
