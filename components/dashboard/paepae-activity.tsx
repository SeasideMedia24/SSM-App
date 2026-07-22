'use client';

// The dashboard "what PaePae did recently" list. Newest 10 unarchived rows show;
// older or archived ones fold into the collapsed Archive below (nothing is
// deleted). Click a row to expand exactly what happened (the same summary lines
// the owner approved, plus PaePae's result message).

import { useState, useTransition } from 'react';
import { setPaepaeActionArchived } from '@/app/(app)/dashboard/actions';
import { Collapsible } from '@/components/ui/collapsible';

export type PaepaeAction = {
  id: string;
  action: string;
  summary: string[];
  result: string | null;
  created_at: string;
};

// Fallback labels per action, used only when a row has no stored result line.
const ACTION_LABELS: Record<string, string> = {
  create_task: 'Created a task',
  update_task: 'Updated a task',
  create_project: 'Created a project',
  update_project: 'Updated a project',
  create_client: 'Added a client',
  update_client: 'Updated a client',
  create_quote: 'Saved a draft quote',
  create_contract: 'Drafted a contract',
  update_contract: 'Updated a contract',
  create_invoice: 'Created an invoice',
  create_deliverable: 'Added a deliverable',
  update_deliverable: 'Updated a deliverable',
  create_milestone: 'Added a milestone',
  update_milestone: 'Updated a milestone',
  assign_contractor: 'Assigned a team member',
  update_quote_status: 'Recorded a quote status',
  update_invoice_status: 'Recorded an invoice status',
  send_email: 'Sent an email',
  create_event: 'Booked a meeting',
};

// The one-line headline for a row: PaePae's own result message is the most
// specific and already reads well ("Created task 'Order gaffer tape'."), so we
// lead with it and fall back to the generic label only when it's missing.
function headline(a: PaepaeAction): string {
  return a.result?.trim() || ACTION_LABELS[a.action] || a.action;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function PaepaeActivity({ actions, archived = [] }: { actions: PaepaeAction[]; archived?: PaepaeAction[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (actions.length === 0 && archived.length === 0) {
    return <p className="py-2 text-sm text-slate-400">PaePae hasn’t made any changes yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {actions.length === 0 ? (
        <p className="py-2 text-sm text-slate-400">Nothing new — everything’s in the archive below.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {actions.map((a) => (
            <Row key={a.id} a={a} open={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} archived={false} />
          ))}
        </ul>
      )}
      {archived.length > 0 && (
        <Collapsible title="Archive" count={archived.length} defaultOpen={false}>
          <ul className="divide-y divide-slate-100">
            {archived.map((a) => (
              <Row key={a.id} a={a} open={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} archived />
            ))}
          </ul>
        </Collapsible>
      )}
    </div>
  );
}

function Row({ a, open, onToggle, archived }: { a: PaepaeAction; open: boolean; onToggle: () => void; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <li className={archived ? 'opacity-70' : undefined}>
      <div className="flex w-full items-center gap-2 py-2 text-sm">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="truncate text-ink">{headline(a)}</span>
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <span className="ml-auto shrink-0 text-[11px] text-slate-400">{timeAgo(a.created_at)}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await setPaepaeActionArchived(a.id, !archived); })}
          title={archived ? 'Restore to the list' : 'Archive (tuck away, keep history)'}
          className="shrink-0 text-[11px] font-medium text-slate-300 transition-colors hover:text-sea disabled:opacity-50"
        >
          {archived ? 'Restore' : 'Archive'}
        </button>
      </div>
      {open && a.summary.length > 0 && (
        <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Details</p>
          <ul className="space-y-0.5 text-xs text-slate-500">
            {a.summary.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}
