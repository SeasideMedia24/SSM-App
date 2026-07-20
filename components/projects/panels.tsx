'use client';

// The per-project view panels: Deliverables, Contracts, Expenses, Budget, and
// Timeline. Each mirrors TasksPanel — an add form on top, then a list with a
// confirm-before-delete. Kept together so they share the small primitives below.

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useUndo } from '@/components/undo/undo-provider';
import { TASK_STATUSES, CONTRACT_STATUSES } from '@/lib/projects/status';
import { money, fmtDate } from '@/lib/projects/format';
import {
  addDeliverable, setDeliverableStatus, deleteDeliverable,
  addContract, setContractStatus, deleteContract,
  addMilestone, setMilestoneStatus, deleteMilestone,
  type PanelState,
} from '@/app/(app)/projects/[id]/actions';
import type { Database, TaskStatus, ContractStatus } from '@/types/database.types';

type Deliverable = Database['public']['Tables']['deliverables']['Row'];
type Contract = Database['public']['Tables']['contracts']['Row'];
type Milestone = Database['public']['Tables']['milestones']['Row'];

const inputCls = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal';

// A number input with a leading "$" so budget/money fields read as dollars.
function MoneyInput({ wrapperClassName = '', className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { wrapperClassName?: string }) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
      <input type="number" step="0.01" {...props} className={`w-full pl-6 ${className}`} />
    </div>
  );
}

function AddButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Adding…' : label}
    </Button>
  );
}
function useResettableForm(state: PanelState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);
  return ref;
}
function StatusSelect({ value, onChange, disabled }: { value: TaskStatus; onChange: (s: TaskStatus) => void; disabled: boolean }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none focus:border-teal"
      aria-label="Status"
    >
      {TASK_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}
function DeleteInline({ action, id, projectId }: { action: (f: FormData) => void; id: string; projectId: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm text-slate-400 transition-colors hover:text-red-600">
        Delete
      </button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="project_id" value={projectId} />
      <button type="submit" className="text-sm font-medium text-red-600">Confirm</button>
      <button type="button" onClick={() => setConfirming(false)} className="text-sm text-slate-400">Cancel</button>
    </form>
  );
}
function EmptyBox({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-8 text-center text-sm text-slate-400">{children}</p>;
}
function ListWrap({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">{children}</ul>;
}

// ── Deliverables ─────────────────────────────────────────────────────────────
export function DeliverablesPanel({ projectId, items }: { projectId: string; items: Deliverable[] }) {
  const [state, action] = useActionState<PanelState, FormData>(addDeliverable.bind(null, projectId), { error: null });
  const ref = useResettableForm(state);
  return (
    <div className="space-y-4">
      <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input name="title" required placeholder="Add a deliverable…" className={`min-w-[220px] flex-1 ${inputCls}`} />
        <input name="due_date" type="date" className={inputCls} aria-label="Due date" />
        <AddButton label="Add deliverable" />
        {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>
      {items.length === 0 ? <EmptyBox>No deliverables yet.</EmptyBox> : (
        <ListWrap>
          {items.map((d) => <StatusRow key={d.id} id={d.id} projectId={projectId} title={d.title} status={d.status} due={d.due_date} onStatus={setDeliverableStatus} onDelete={deleteDeliverable} />)}
        </ListWrap>
      )}
    </div>
  );
}

// ── Timeline / Milestones ────────────────────────────────────────────────────
export function TimelinePanel({ projectId, items }: { projectId: string; items: Milestone[] }) {
  const [state, action] = useActionState<PanelState, FormData>(addMilestone.bind(null, projectId), { error: null });
  const ref = useResettableForm(state);
  return (
    <div className="space-y-4">
      <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input name="title" required placeholder="Add a milestone…" className={`min-w-[220px] flex-1 ${inputCls}`} />
        <input name="date" type="date" className={inputCls} aria-label="Date" />
        <AddButton label="Add milestone" />
        {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>
      {items.length === 0 ? <EmptyBox>No milestones yet.</EmptyBox> : (
        <ListWrap>
          {items.map((m) => <StatusRow key={m.id} id={m.id} projectId={projectId} title={m.title} status={m.status} due={m.date} onStatus={setMilestoneStatus} onDelete={deleteMilestone} />)}
        </ListWrap>
      )}
    </div>
  );
}

// Shared row for deliverables & milestones (status + title + date + delete).
function StatusRow({ id, projectId, title, status, due, onStatus, onDelete }: {
  id: string; projectId: string; title: string; status: TaskStatus; due: string | null;
  onStatus: (id: string, projectId: string, s: TaskStatus) => void; onDelete: (f: FormData) => void;
}) {
  const [pending, start] = useTransition();
  const undo = useUndo();
  const d = fmtDate(due);

  function changeStatus(next: TaskStatus) {
    const prev = status;
    start(() => onStatus(id, projectId, next));
    undo.register({
      label: `Marked “${title}” ${TASK_STATUSES.find((s) => s.value === next)?.label ?? next}`,
      undo: () => onStatus(id, projectId, prev),
    });
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <StatusSelect value={status} disabled={pending} onChange={changeStatus} />
      <span className={`flex-1 text-sm ${status === 'done' ? 'text-slate-400 line-through' : 'text-ink'}`}>{title}</span>
      {d && <span className="text-[11px] text-slate-400">{d}</span>}
      <DeleteInline action={onDelete} id={id} projectId={projectId} />
    </li>
  );
}

// ── Contracts ────────────────────────────────────────────────────────────────
export function ContractsPanel({ projectId, items }: { projectId: string; items: Contract[] }) {
  const [state, action] = useActionState<PanelState, FormData>(addContract.bind(null, projectId), { error: null });
  const ref = useResettableForm(state);
  return (
    <div className="space-y-4">
      <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input name="title" required placeholder="Contract name…" className={`min-w-[180px] flex-1 ${inputCls}`} />
        <MoneyInput name="amount" placeholder="Amount" wrapperClassName="w-28" className={inputCls} aria-label="Amount" />
        <input name="signed_date" type="date" className={inputCls} aria-label="Signed date" />
        <AddButton label="Add contract" />
        {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>
      {items.length === 0 ? <EmptyBox>No contracts yet.</EmptyBox> : (
        <ListWrap>
          {items.map((c) => <ContractRow key={c.id} c={c} projectId={projectId} />)}
        </ListWrap>
      )}
    </div>
  );
}
function ContractRow({ c, projectId }: { c: Contract; projectId: string }) {
  const [pending, start] = useTransition();
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <select
        value={c.status}
        disabled={pending}
        onChange={(e) => start(() => setContractStatus(c.id, projectId, e.target.value as ContractStatus))}
        className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 outline-none focus:border-teal"
        aria-label="Contract status"
      >
        {CONTRACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <span className="flex-1 text-sm text-ink">{c.title}</span>
      {c.amount != null && <span className="text-sm text-slate-600">{money(c.amount)}</span>}
      {fmtDate(c.signed_date) && <span className="text-[11px] text-slate-400">{fmtDate(c.signed_date)}</span>}
      <Link href={`/contracts/${c.id}`} className="text-xs font-medium text-sea hover:underline">Open</Link>
      <DeleteInline action={deleteContract} id={c.id} projectId={projectId} />
    </li>
  );
}

// Expenses and manual budget-lines were removed: a project's budget now derives
// entirely from its linked quotes (see components/projects/quote-budget.tsx and
// lib/projects/budget.ts). The underlying tables are untouched, so this is
// reversible if those panels are ever wanted back.
