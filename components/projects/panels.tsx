'use client';

// The per-project view panels: Deliverables, Contracts, Expenses, Budget, and
// Timeline. Each mirrors TasksPanel — an add form on top, then a list with a
// confirm-before-delete. Kept together so they share the small primitives below.

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { TASK_STATUSES, CONTRACT_STATUSES } from '@/lib/projects/status';
import { money, fmtDate } from '@/lib/projects/format';
import {
  addDeliverable, setDeliverableStatus, deleteDeliverable,
  addContract, setContractStatus, deleteContract,
  addExpense, deleteExpense,
  addBudgetLine, updateBudgetLine, deleteBudgetLine,
  addMilestone, setMilestoneStatus, deleteMilestone,
  type PanelState,
} from '@/app/(app)/projects/[id]/actions';
import type { Database, TaskStatus, ContractStatus } from '@/types/database.types';

type Deliverable = Database['public']['Tables']['deliverables']['Row'];
type Contract = Database['public']['Tables']['contracts']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];
type BudgetLine = Database['public']['Tables']['budget_lines']['Row'];
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
  const d = fmtDate(due);
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <StatusSelect value={status} disabled={pending} onChange={(s) => start(() => onStatus(id, projectId, s))} />
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
      <DeleteInline action={deleteContract} id={c.id} projectId={projectId} />
    </li>
  );
}

// ── Expenses ─────────────────────────────────────────────────────────────────
export function ExpensesPanel({ projectId, items }: { projectId: string; items: Expense[] }) {
  const [state, action] = useActionState<PanelState, FormData>(addExpense.bind(null, projectId), { error: null });
  const ref = useResettableForm(state);
  const total = items.reduce((s, e) => s + (e.amount ?? 0), 0);
  return (
    <div className="space-y-4">
      <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input name="label" required placeholder="Expense…" className={`min-w-[160px] flex-1 ${inputCls}`} />
        <input name="category" placeholder="Category" className={`w-32 ${inputCls}`} />
        <MoneyInput name="amount" placeholder="Amount" wrapperClassName="w-28" className={inputCls} aria-label="Amount" />
        <input name="spent_on" type="date" className={inputCls} aria-label="Date" />
        <AddButton label="Add expense" />
        {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>
      {items.length === 0 ? <EmptyBox>No expenses yet.</EmptyBox> : (
        <>
          <ListWrap>
            {items.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex-1 text-sm text-ink">{e.label}</span>
                {e.category && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{e.category}</span>}
                {fmtDate(e.spent_on) && <span className="text-[11px] text-slate-400">{fmtDate(e.spent_on)}</span>}
                <span className="text-sm text-slate-700">{money(e.amount)}</span>
                <DeleteInline action={deleteExpense} id={e.id} projectId={projectId} />
              </li>
            ))}
          </ListWrap>
          <p className="text-right text-sm text-slate-600">Total spent: <span className="font-semibold text-ink">{money(total)}</span></p>
        </>
      )}
    </div>
  );
}

// ── Budget (with rollup + profit) ────────────────────────────────────────────
export function BudgetPanel({ projectId, items, quoteTotal, expensesTotal }: {
  projectId: string; items: BudgetLine[]; quoteTotal: number | null; expensesTotal: number;
}) {
  const [state, action] = useActionState<PanelState, FormData>(addBudgetLine.bind(null, projectId), { error: null });
  const ref = useResettableForm(state);
  const planned = items.reduce((s, b) => s + (b.planned_amount ?? 0), 0);
  const actual = items.reduce((s, b) => s + (b.actual_amount ?? 0), 0);
  const profit = quoteTotal != null ? quoteTotal - expensesTotal : null;

  return (
    <div className="space-y-5">
      {/* Rollup cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Roll label="Quote total" value={quoteTotal != null ? money(quoteTotal) : '—'} />
        <Roll label="Planned" value={money(planned)} />
        <Roll label="Spent (expenses)" value={money(expensesTotal)} />
        <Roll label="Profit" value={profit != null ? money(profit) : '—'} accent={profit != null && profit < 0 ? 'neg' : 'pos'} />
      </div>

      <form ref={ref} action={action} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <input name="label" required placeholder="Budget line…" className={`min-w-[180px] flex-1 ${inputCls}`} />
        <MoneyInput name="planned_amount" placeholder="Planned" wrapperClassName="w-28" className={inputCls} aria-label="Planned" />
        <MoneyInput name="actual_amount" placeholder="Actual" wrapperClassName="w-28" className={inputCls} aria-label="Actual" />
        <AddButton label="Add line" />
        {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>

      {items.length === 0 ? <EmptyBox>No budget lines yet.</EmptyBox> : (
        <ListWrap>
          <li className="flex items-center gap-3 bg-slate-50 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-400">
            <span className="flex-1">Line</span><span className="w-28 text-right">Planned</span><span className="w-28 text-right">Actual</span><span className="w-16" />
          </li>
          {items.map((b) => <BudgetRow key={b.id} b={b} projectId={projectId} />)}
          <li className="flex items-center gap-3 bg-slate-50 px-3 py-2 text-sm font-semibold text-ink">
            <span className="flex-1">Total</span><span className="w-28 text-right">{money(planned)}</span><span className="w-28 text-right">{money(actual)}</span><span className="w-16" />
          </li>
        </ListWrap>
      )}
    </div>
  );
}
function Roll({ label, value, accent }: { label: string; value: string; accent?: 'pos' | 'neg' }) {
  const color = accent === 'neg' ? 'text-red-600' : accent === 'pos' ? 'text-green-700' : 'text-ink';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
function BudgetRow({ b, projectId }: { b: BudgetLine; projectId: string }) {
  const [, start] = useTransition();
  function commit(field: 'planned_amount' | 'actual_amount', raw: string) {
    const n = Number(raw);
    if (Number.isFinite(n) && n !== b[field]) start(() => updateBudgetLine(b.id, projectId, field, n));
  }
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <span className="flex-1 text-sm text-ink">{b.label}</span>
      <MoneyInput defaultValue={b.planned_amount} onBlur={(e) => commit('planned_amount', e.target.value)}
        wrapperClassName="w-28" className="rounded-md border border-slate-200 py-1 pr-2 text-right text-sm outline-none focus:border-teal" aria-label="Planned amount" />
      <MoneyInput defaultValue={b.actual_amount} onBlur={(e) => commit('actual_amount', e.target.value)}
        wrapperClassName="w-28" className="rounded-md border border-slate-200 py-1 pr-2 text-right text-sm outline-none focus:border-teal" aria-label="Actual amount" />
      <div className="w-16 text-right"><DeleteInline action={deleteBudgetLine} id={b.id} projectId={projectId} /></div>
    </li>
  );
}
