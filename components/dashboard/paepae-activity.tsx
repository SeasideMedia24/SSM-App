'use client';

// The dashboard "what PaePae did recently" list. Each row is a confirmed action
// from the last few days; click one to expand exactly what happened (the same
// summary lines the owner approved, plus PaePae's result message).

import { useState } from 'react';

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

export function PaepaeActivity({ actions }: { actions: PaepaeAction[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (actions.length === 0) {
    return <p className="py-2 text-sm text-slate-400">PaePae hasn’t made any changes in the last 5 days.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {actions.map((a) => {
        const open = openId === a.id;
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : a.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-2 py-2 text-left text-sm"
            >
              <span className="truncate text-ink">{headline(a)}</span>
              <span className="ml-auto shrink-0 text-[11px] text-slate-400">{timeAgo(a.created_at)}</span>
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
      })}
    </ul>
  );
}
