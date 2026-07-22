'use client';

// The dashboard "Recent quotes" list. Newest 10 unarchived show; older or
// archived quotes fold into the collapsed Archive below. Archiving here hides a
// quote from the DASHBOARD only — the Calculator's saved list is untouched.

import Link from 'next/link';
import { useTransition } from 'react';
import { setQuoteDashboardArchived } from '@/app/(app)/dashboard/actions';
import { Collapsible } from '@/components/ui/collapsible';
import { quoteStatusMeta } from '@/lib/projects/status';
import { money } from '@/lib/projects/format';
import type { QuoteStatus } from '@/types/database.types';

export type DashQuote = {
  id: string;
  title: string;
  status: string;
  total: number;
  clientName: string | null;
};

export function RecentQuotes({ quotes, archived = [] }: { quotes: DashQuote[]; archived?: DashQuote[] }) {
  if (quotes.length === 0 && archived.length === 0) {
    return (
      <p className="py-2 text-sm text-slate-400">
        No quotes yet — build one in the <Link href="/calculator" className="text-sea underline">Price Calculator</Link>.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {quotes.length === 0 ? (
        <p className="py-2 text-sm text-slate-400">Nothing new — everything’s in the archive below.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {quotes.map((q) => <Row key={q.id} q={q} archived={false} />)}
        </ul>
      )}
      {archived.length > 0 && (
        <Collapsible title="Archive" count={archived.length} defaultOpen={false}>
          <ul className="divide-y divide-slate-100">
            {archived.map((q) => <Row key={q.id} q={q} archived />)}
          </ul>
        </Collapsible>
      )}
    </div>
  );
}

function Row({ q, archived }: { q: DashQuote; archived: boolean }) {
  const [pending, start] = useTransition();
  const meta = quoteStatusMeta(q.status as QuoteStatus);
  return (
    <li className={`flex items-center gap-3 py-2 text-sm ${archived ? 'opacity-70' : ''}`}>
      <Link href={`/calculator?quote=${q.id}`} className="truncate text-ink hover:underline">{q.title}</Link>
      {q.clientName && <span className="shrink-0 text-xs text-slate-500">{q.clientName}</span>}
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>{meta.label}</span>
      <span className="ml-auto shrink-0 font-medium text-slate-700">{money(q.total)}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await setQuoteDashboardArchived(q.id, !archived); })}
        title={archived ? 'Restore to the list' : 'Hide from the dashboard (stays in the Calculator)'}
        className="shrink-0 text-[11px] font-medium text-slate-300 transition-colors hover:text-sea disabled:opacity-50"
      >
        {archived ? 'Restore' : 'Archive'}
      </button>
    </li>
  );
}
