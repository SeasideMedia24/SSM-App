'use client';

// The owner's contract editor: edit the variable terms on the left, see the
// finished document render live on the right, then send it for signature. The
// "Send for signature" button is blocked (with a checklist of what's missing)
// until the SAME readiness check PaePae will use passes. Sending snapshots the
// document and mints the private /contract/<token> e-sign link.

import { useMemo, useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { renderContract, type ContractTerms, type Deliverable } from '@/lib/contracts/template';
import { contractReadiness } from '@/lib/contracts/validate';
import {
  updateContractTerms, sendContractForSignature, revokeContractLink,
  type ContractFormState,
} from '@/app/(app)/contracts/actions';
import { fmtDate } from '@/lib/projects/format';
import type { ContractStatus } from '@/types/database.types';

const field =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

export type ContractEditorData = {
  id: string;
  project_id: string;
  title: string;
  status: ContractStatus;
  effective_date: string | null;
  deposit_amount: number | null;
  production_amount: number | null;
  delivery_amount: number | null;
  revision_rounds: number;
  revision_pct: number;
  deliverables_snapshot: Deliverable[];
  share_token: string | null;
  body_md: string | null;
  signer_name: string | null;
  signer_title: string | null;
  signed_at: string | null;
  deposit_invoice_id: string | null;
  production_date: string | null;
};

// Minimal markdown styling (no typography plugin) — enough for a legible contract.
const md = {
  h1: (p: React.ComponentProps<'h1'>) => <h1 className="mb-2 mt-1 text-xl font-semibold text-ink" {...p} />,
  h2: (p: React.ComponentProps<'h2'>) => <h2 className="mb-1 mt-4 text-base font-semibold text-ink" {...p} />,
  p: (p: React.ComponentProps<'p'>) => <p className="mb-2 text-sm leading-relaxed text-slate-700" {...p} />,
  ul: (p: React.ComponentProps<'ul'>) => <ul className="mb-2 ml-5 list-disc text-sm text-slate-700" {...p} />,
  ol: (p: React.ComponentProps<'ol'>) => <ol className="mb-2 ml-5 list-decimal text-sm text-slate-700" {...p} />,
  li: (p: React.ComponentProps<'li'>) => <li className="mb-0.5" {...p} />,
  strong: (p: React.ComponentProps<'strong'>) => <strong className="font-semibold text-ink" {...p} />,
  em: (p: React.ComponentProps<'em'>) => <em className="text-slate-500" {...p} />,
};

export function ContractEditor({
  contract, clientName, clientCompany, projectTitle,
}: {
  contract: ContractEditorData;
  clientName: string;
  clientCompany: string | null;
  projectTitle: string;
}) {
  const signed = contract.status === 'signed';

  const [title, setTitle] = useState(contract.title);
  const [effectiveDate, setEffectiveDate] = useState(contract.effective_date ?? '');
  const [deposit, setDeposit] = useState(contract.deposit_amount?.toString() ?? '');
  const [production, setProduction] = useState(contract.production_amount?.toString() ?? '');
  const [delivery, setDelivery] = useState(contract.delivery_amount?.toString() ?? '');
  const [rounds, setRounds] = useState(contract.revision_rounds?.toString() ?? '2');
  const [pct, setPct] = useState(contract.revision_pct?.toString() ?? '10');
  const [productionDate, setProductionDate] = useState(contract.production_date ?? '');
  const [deliverables, setDeliverables] = useState<Deliverable[]>(
    contract.deliverables_snapshot.length > 0 ? contract.deliverables_snapshot : [{ title: '', due: null }],
  );
  const setDeliverable = (i: number, patch: Partial<Deliverable>) =>
    setDeliverables((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const addDeliverable = () => setDeliverables((prev) => [...prev, { title: '', due: null }]);
  const removeDeliverable = (i: number) => setDeliverables((prev) => prev.filter((_, j) => j !== i));

  const [saveState, setSaveState] = useState<ContractFormState>({ ok: false, error: null });
  const [savedTick, setSavedTick] = useState(false);
  const [token, setToken] = useState(contract.share_token);
  const [missing, setMissing] = useState<string[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const num = (s: string): number | null => {
    const t = s.trim();
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };
  // Only deliverables with a title count / render.
  const cleanDeliverables = deliverables.map((d) => ({ title: d.title.trim(), due: d.due || null })).filter((d) => d.title !== '');

  const readiness = contractReadiness({
    clientName, projectName: projectTitle, effectiveDate: effectiveDate || null,
    depositAmount: num(deposit), productionAmount: num(production), deliveryAmount: num(delivery),
    revisionRounds: num(rounds), revisionPct: num(pct), deliverablesCount: cleanDeliverables.length,
  });

  const preview: ContractTerms = useMemo(() => ({
    clientName, clientCompany, projectName: projectTitle,
    effectiveDate: effectiveDate || null,
    depositAmount: num(deposit) ?? 0, productionAmount: num(production) ?? 0, deliveryAmount: num(delivery) ?? 0,
    deliverables: cleanDeliverables, revisionRounds: num(rounds) ?? 0, revisionPct: num(pct) ?? 0,
    productionDate: productionDate || null,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [clientName, clientCompany, projectTitle, effectiveDate, deposit, production, delivery, deliverables, rounds, pct, productionDate]);

  const previewMd = signed && contract.body_md ? contract.body_md : renderContract(preview);

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set('id', contract.id);
    fd.set('title', title);
    fd.set('effective_date', effectiveDate);
    fd.set('deposit_amount', deposit);
    fd.set('production_amount', production);
    fd.set('delivery_amount', delivery);
    fd.set('revision_rounds', rounds);
    fd.set('revision_pct', pct);
    fd.set('production_date', productionDate);
    fd.set('deliverables_json', JSON.stringify(cleanDeliverables));
    return fd;
  }

  function save() {
    start(async () => {
      setSendError(null);
      const res = await updateContractTerms({ ok: false, error: null }, buildFormData());
      setSaveState(res);
      if (res.ok) { setSavedTick(true); setTimeout(() => setSavedTick(false), 1500); }
    });
  }

  function send() {
    start(async () => {
      setSendError(null);
      setMissing([]);
      // Save the latest edits first, then send — one action from the owner's view.
      const saved = await updateContractTerms({ ok: false, error: null }, buildFormData());
      if (!saved.ok) { setSaveState(saved); return; }
      const res = await sendContractForSignature(contract.id);
      if (res.ok) setToken(res.token);
      else { setSendError(res.error); if (res.missing) setMissing(res.missing); }
    });
  }

  function revoke() {
    start(async () => {
      const res = await revokeContractLink(contract.id);
      if (res.ok) setToken(null);
      else setSendError(res.error);
    });
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = token && origin ? `${origin}/contract/${token}` : '';
  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
      {/* ── Left: editable terms ── */}
      <div className="flex min-w-0 flex-col gap-4">
        {signed && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Signed by {contract.signer_name}{contract.signer_title ? `, ${contract.signer_title}` : ''} on {fmtDate(contract.signed_at?.slice(0, 10) ?? null)}. The terms are locked.
          </div>
        )}

        <fieldset disabled={signed || pending} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Contract title
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
          </label>
          <div className="grid grid-cols-2 items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              <span className="truncate whitespace-nowrap">Effective date</span>
              <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              <span className="truncate whitespace-nowrap">Production date <span className="font-normal text-slate-400">(optional)</span></span>
              <input type="date" value={productionDate} onChange={(e) => setProductionDate(e.target.value)} className={field} />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Money label="Deposit" value={deposit} onChange={setDeposit} />
            <Money label="After prod." value={production} onChange={setProduction} />
            <Money label="On delivery" value={delivery} onChange={setDelivery} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Revision rounds
              <input type="number" min="0" step="1" value={rounds} onChange={(e) => setRounds(e.target.value)} className={field} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Coverage %
              <input type="number" min="0" max="100" step="1" value={pct} onChange={(e) => setPct(e.target.value)} className={field} />
            </label>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-slate-500">
              Deliverables <span className="font-normal text-slate-400">(what, and when it’s due)</span>
            </span>
            {deliverables.map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <input
                  value={d.title}
                  onChange={(e) => setDeliverable(i, { title: e.target.value })}
                  placeholder="e.g. 60-second brand film"
                  className={`${field} flex-1`}
                />
                <input
                  type="date"
                  value={d.due ?? ''}
                  onChange={(e) => setDeliverable(i, { due: e.target.value || null })}
                  aria-label="Due date"
                  className={`${field} w-[8.5rem]`}
                />
                <button
                  type="button"
                  onClick={() => removeDeliverable(i)}
                  aria-label="Remove deliverable"
                  className="mt-1.5 px-1 text-slate-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addDeliverable}
              className="self-start text-xs font-medium text-sea hover:underline"
            >
              + Add deliverable
            </button>
          </div>
        </fieldset>

        {!signed && (
          <div className="flex items-center gap-3">
            <button
              type="button" onClick={save} disabled={pending}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-teal hover:text-sea disabled:opacity-60"
            >
              {pending ? 'Saving…' : savedTick ? 'Saved ✓' : 'Save draft'}
            </button>
            {saveState.error && <span className="text-xs text-red-600">{saveState.error}</span>}
          </div>
        )}

        {/* Readiness + send */}
        {!signed && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            {readiness.length > 0 ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Before you can send</p>
                <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-600">
                  {readiness.map((m) => (
                    <li key={m} className="flex items-center gap-2"><span className="text-amber-500">○</span>{m}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <button
                  type="button" onClick={send} disabled={pending}
                  className="brand-gradient w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110 disabled:opacity-60"
                >
                  {pending ? 'Working…' : token ? 'Re-send (new link)' : 'Send for signature'}
                </button>
                {token && <p className="mt-2 text-xs text-slate-400">Re-sending re-renders the document and replaces the old link.</p>}
              </>
            )}
            {sendError && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-800">{sendError}</p>
            )}
            {missing.length > 0 && (
              <p className="mt-1 text-xs text-amber-700">Missing: {missing.join(', ')}.</p>
            )}
          </div>
        )}

        {/* Share link (once sent) */}
        {token && (
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {signed ? 'Signed contract link' : 'Signature link'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="w-full max-w-full flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 outline-none" />
              <button type="button" onClick={copy} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">{copied ? 'Copied!' : 'Copy'}</button>
              <a href={link} target="_blank" rel="noreferrer" className="rounded-lg bg-sea px-3 py-1.5 text-xs font-medium text-white hover:brightness-110">Open</a>
              {!signed && <button type="button" onClick={revoke} disabled={pending} className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-60">Turn off</button>}
            </div>
            {contract.deposit_invoice_id && (
              <a href={`/invoices/${contract.deposit_invoice_id}`} className="text-xs font-medium text-sea hover:underline">View the deposit invoice →</a>
            )}
          </div>
        )}
      </div>

      {/* ── Right: live document preview (contained + scrolls, sticky on wide screens) ── */}
      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-6">
        <p className="border-b border-slate-100 bg-slate-50 px-6 py-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          Live preview
        </p>
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto px-8 py-6">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{previewMd}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function Money({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      <span className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
        <input type="number" min="0" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" className={`${field} w-full pl-6`} />
      </span>
    </label>
  );
}
