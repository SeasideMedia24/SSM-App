'use client';

// A quick dropdown on the calculator to jump into a past saved quote (or back to
// a fresh one). Selecting a quote navigates to ?quote=<id>, which loads its exact
// selections into the calculator for viewing or editing.

import { useRouter } from 'next/navigation';

export type SavedQuoteOption = { id: string; title: string; client: string | null };

export function SavedQuotePicker({ quotes, currentId }: { quotes: SavedQuoteOption[]; currentId: string | null }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="saved-quote" className="text-sm font-medium text-slate-600">Load a saved quote</label>
      <select
        id="saved-quote"
        value={currentId ?? ''}
        onChange={(e) => {
          const id = e.target.value;
          router.push(id ? `/calculator?quote=${id}` : '/calculator');
        }}
        className="min-w-[16rem] max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal"
      >
        <option value="">New quote…</option>
        {quotes.map((q) => (
          <option key={q.id} value={q.id}>
            {q.title}{q.client ? ` — ${q.client}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
