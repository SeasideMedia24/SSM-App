'use client';

// The interactive quote builder. Rows live in React state for instant math;
// on save they're serialized into one hidden JSON field and the server action
// (app/(app)/calculator/actions.ts) recomputes and stores the real numbers.

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { saveQuote, type QuoteFormState } from '@/app/(app)/calculator/actions';
import { money } from '@/lib/projects/format';

const field =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

export type PresetOption = { id: string; label: string; unit: string; default_rate: number };
export type ClientOption = { id: string; name: string; company: string | null };
export type ProjectOption = { id: string; title: string; client_id: string };

export type BuilderRow = { key: string; label: string; quantity: string; unit: string; rate: string };

export type QuoteInitial = {
  id: string;
  title: string;
  client_id: string;
  project_id: string | null;
  notes: string | null;
  items: { label: string; quantity: number; unit: string | null; rate: number }[];
};

let keyCounter = 0;
const newKey = () => `row-${++keyCounter}-${Date.now()}`;

function emptyRow(): BuilderRow {
  return { key: newKey(), label: '', quantity: '1', unit: '', rate: '' };
}

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="brand-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? 'Saving…' : editing ? 'Save changes' : 'Save quote'}
    </button>
  );
}

export function QuoteBuilder({
  clients,
  projects,
  presets,
  initial,
}: {
  clients: ClientOption[];
  projects: ProjectOption[];
  presets: PresetOption[];
  initial?: QuoteInitial;
}) {
  const [state, action] = useActionState<QuoteFormState, FormData>(saveQuote, { error: null });

  const [clientId, setClientId] = useState(initial?.client_id ?? '');
  const [rows, setRows] = useState<BuilderRow[]>(() =>
    initial && initial.items.length > 0
      ? initial.items.map((it) => ({
          key: newKey(),
          label: it.label,
          quantity: String(it.quantity),
          unit: it.unit ?? '',
          rate: String(it.rate),
        }))
      : [emptyRow()],
  );

  // Projects narrowed to the selected client (a quote can also stand alone).
  const clientProjects = useMemo(() => projects.filter((p) => p.client_id === clientId), [projects, clientId]);

  // Live math — display only; the server recomputes on save.
  const amounts = rows.map((r) => (parseFloat(r.quantity) || 0) * (parseFloat(r.rate) || 0));
  const subtotal = amounts.reduce((a, b) => a + b, 0);

  // Rows are serialized for the server; blank rows (no label AND no rate) are dropped.
  const itemsJson = JSON.stringify(
    rows
      .filter((r) => r.label.trim() !== '' || r.rate.trim() !== '')
      .map((r) => ({
        label: r.label,
        quantity: parseFloat(r.quantity) || 0,
        unit: r.unit,
        rate: parseFloat(r.rate) || 0,
      })),
  );

  function update(key: string, patch: Partial<BuilderRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function remove(key: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : [emptyRow()]));
  }
  function addPreset(presetId: string) {
    const p = presets.find((x) => x.id === presetId);
    if (!p) return;
    const row: BuilderRow = { key: newKey(), label: p.label, quantity: '1', unit: p.unit, rate: String(p.default_rate) };
    // Replace a single untouched starter row instead of leaving it hanging.
    setRows((rs) => (rs.length === 1 && rs[0].label === '' && rs[0].rate === '' ? [row] : [...rs, row]));
  }

  return (
    <form action={action} className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="items" value={itemsJson} />

      {/* Who and what this quote is for */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">
            Client <span className="text-red-500">*</span>
          </span>
          <select name="client_id" required value={clientId} onChange={(e) => setClientId(e.target.value)} className={field}>
            <option value="">Choose a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.company ? ` — ${c.company}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Project (optional)</span>
          <select name="project_id" defaultValue={initial?.project_id ?? ''} className={field} disabled={!clientId}>
            <option value="">No project</option>
            {clientProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">
            Quote title <span className="text-red-500">*</span>
          </span>
          <input name="title" required defaultValue={initial?.title ?? ''} placeholder="e.g. Brand film — production" className={field} />
        </label>
      </div>

      {/* Line items */}
      <div>
        <div className="mb-1.5 hidden grid-cols-[1fr_5.5rem_6.5rem_7rem_6.5rem_2rem] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500 sm:grid">
          <span>Item</span><span>Qty</span><span>Unit</span><span>Rate</span><span className="text-right">Amount</span><span />
        </div>
        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <motion.div
              key={r.key}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="mb-2 grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2 sm:grid-cols-[1fr_5.5rem_6.5rem_7rem_6.5rem_2rem] sm:border-0 sm:bg-transparent sm:p-0"
            >
              <input
                aria-label="Item description"
                value={r.label}
                onChange={(e) => update(r.key, { label: e.target.value })}
                placeholder="Description"
                className={`${field} col-span-2 sm:col-span-1`}
              />
              <input
                aria-label="Quantity"
                type="number" min="0" step="0.5"
                value={r.quantity}
                onChange={(e) => update(r.key, { quantity: e.target.value })}
                className={field}
              />
              <input
                aria-label="Unit"
                value={r.unit}
                onChange={(e) => update(r.key, { unit: e.target.value })}
                placeholder="day / hour"
                className={field}
              />
              <input
                aria-label="Rate"
                type="number" min="0" step="0.01"
                value={r.rate}
                onChange={(e) => update(r.key, { rate: e.target.value })}
                placeholder="0.00"
                className={field}
              />
              <div className="flex items-center justify-end text-sm font-medium text-slate-700">{money(amounts[i])}</div>
              <button
                type="button"
                onClick={() => remove(r.key)}
                aria-label="Remove line"
                className="flex items-center justify-center text-slate-300 transition-colors hover:text-red-500"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add rows: from a preset, or blank */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            aria-label="Add from preset"
            value=""
            onChange={(e) => { addPreset(e.target.value); e.target.value = ''; }}
            className={`${field} w-56`}
          >
            <option value="">+ Add from preset…</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({money(p.default_rate)}/{p.unit})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setRows((rs) => [...rs, emptyRow()])}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea"
          >
            + Custom line
          </button>
        </div>
      </div>

      {/* Notes + totals + save */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_16rem]">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Notes</span>
          <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ''} placeholder="Terms, assumptions, anything the client should know…" className={field} />
        </label>
        <div className="flex flex-col justify-end gap-2 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Subtotal</span><span>{money(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900">
            <span>Total</span><span>{money(subtotal)}</span>
          </div>
        </div>
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        {initial && (
          <a href="/calculator" className="text-sm text-slate-500 hover:text-slate-700">
            Cancel editing
          </a>
        )}
        <SaveButton editing={!!initial} />
      </div>
    </form>
  );
}
