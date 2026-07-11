'use client';

// The Production Price Calculator — a web version of the owner's Google Sheet.
// Everything is clickable: shoot amounts, crew checkboxes (+ quantity), rental
// tier, pre/post services, travel, discounts. Totals update live via the same
// pure engine the server uses (lib/pricing/engine.ts); on save the server
// recomputes from database rates, so these numbers are display-only.

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveQuote, quickCreateClient, type QuoteFormState } from '@/app/(app)/calculator/actions';
import {
  computeQuote, emptySelections, RENTAL_LABELS, DISCOUNT_LABELS,
  type CalculatorSelections, type RoleRates, type PageService, type PricingConfig,
  type RentalTier, type DiscountKey, type PhotographerBooking,
} from '@/lib/pricing/engine';
import { money } from '@/lib/projects/format';

const field =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

export type ClientOption = { id: string; name: string; company: string | null };
export type ProjectOption = { id: string; title: string; client_id: string };

export type QuoteInitial = {
  id: string;
  title: string;
  client_id: string;
  project_id: string | null;
  notes: string | null;
  selections: CalculatorSelections | null;
};

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

// Where an in-progress (unsaved) quote is stashed so it survives navigating
// away, editing rates, or closing the app. Only used for brand-new quotes —
// editing an existing quote is anchored to that saved record, not the draft.
const DRAFT_KEY = 'ssm-calculator-draft';

type Draft = { clientId: string; projectId: string; title: string; selections: CalculatorSelections };

export function ProductionCalculator({
  clients, projects, roles, services, config, initial, justSaved = false,
}: {
  clients: ClientOption[];
  projects: ProjectOption[];
  roles: RoleRates[];
  services: PageService[];
  config: PricingConfig;
  initial?: QuoteInitial;
  justSaved?: boolean;
}) {
  const editing = !!initial;
  const [state, action] = useActionState<QuoteFormState, FormData>(saveQuote, { error: null });
  const [clientId, setClientId] = useState(initial?.client_id ?? '');
  const [projectId, setProjectId] = useState(initial?.project_id ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  // Clients are seeded from the server but can grow via quick-add below.
  const [clientList, setClientList] = useState<ClientOption[]>(clients);
  const [s, setS] = useState<CalculatorSelections>(() => initial?.selections ?? emptySelections());

  // Draft persistence (new quotes only). We hydrate after mount — localStorage
  // isn't available during server rendering, so reading it in a useState
  // initializer would cause a hydration mismatch.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (editing) { setHydrated(true); return; }
    if (justSaved) {
      // The quote we were working on just saved — start fresh.
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setHydrated(true);
      return;
    }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Partial<Draft>;
        if (d.clientId) setClientId(d.clientId);
        if (d.projectId) setProjectId(d.projectId);
        if (typeof d.title === 'string') setTitle(d.title);
        if (d.selections) setS(d.selections);
      }
    } catch { /* ignore malformed draft */ }
    setHydrated(true);
  }, [editing, justSaved]);

  // Persist the working state as it changes (new quotes only, after hydration so
  // we don't clobber a saved draft with the empty initial state).
  useEffect(() => {
    if (editing || !hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ clientId, projectId, title, selections: s } satisfies Draft));
    } catch { /* quota/private mode — non-fatal */ }
  }, [editing, hydrated, clientId, projectId, title, s]);

  const clientProjects = useMemo(() => projects.filter((p) => p.client_id === clientId), [projects, clientId]);
  const preServices = services.filter((x) => x.phase === 'pre');
  const postServices = services.filter((x) => x.phase === 'post');

  // Live totals — display only; the server recomputes on save.
  const q = computeQuote(s, roles, services, config);

  const set = (patch: Partial<CalculatorSelections>) => setS((prev) => ({ ...prev, ...patch }));
  const num = (v: string) => Math.max(0, parseFloat(v) || 0);

  function toggleRole(id: string) {
    setS((prev) => {
      const roles = { ...prev.roles };
      if (roles[id]) delete roles[id];
      else {
        const role = rolesById.get(id);
        roles[id] = role?.kind === 'photographer' ? { quantity: 1, booking: 'half' } : { quantity: 1 };
      }
      return { ...prev, roles };
    });
  }
  function setRole(id: string, patch: { quantity?: number; booking?: PhotographerBooking }) {
    setS((prev) => ({ ...prev, roles: { ...prev.roles, [id]: { ...prev.roles[id], ...patch } } }));
  }
  function toggleService(id: string) {
    setS((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id) ? prev.serviceIds.filter((x) => x !== id) : [...prev.serviceIds, id],
    }));
  }
  function toggleDiscount(key: DiscountKey) {
    setS((prev) => ({
      ...prev,
      discounts: prev.discounts.includes(key) ? prev.discounts.filter((x) => x !== key) : [...prev.discounts, key],
    }));
  }
  const rolesById = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

  const rentalTiers: { value: RentalTier; label: string; price: number }[] = [
    { value: 'none', label: 'None', price: 0 },
    ...(['low', 'medium_low', 'medium', 'high'] as const).map((t) => ({
      value: t as RentalTier, label: RENTAL_LABELS[t], price: config[`rental_${t}`] ?? 0,
    })),
  ];

  return (
    <form action={action} className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_18rem]">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="selections" value={JSON.stringify(s)} />

      <div className="flex flex-col gap-6">
        {/* ① Who this quote is for */}
        <Card title="Quote">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Labeled label="Client" required>
              <select
                name="client_id"
                required
                value={clientId}
                onChange={(e) => { setClientId(e.target.value); setProjectId(''); }}
                className={field}
              >
                <option value="">Choose a client…</option>
                {clientList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
                ))}
              </select>
              <QuickAddClient
                onCreated={(c) => {
                  setClientList((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
                  setClientId(c.id);
                  setProjectId('');
                }}
              />
            </Labeled>
            <Labeled label="Project (optional)">
              <select name="project_id" value={projectId} onChange={(e) => setProjectId(e.target.value)} className={field} disabled={!clientId}>
                <option value="">No project</option>
                {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </Labeled>
            <Labeled label="Quote title" required>
              <input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Brand film — production" className={field} />
            </Labeled>
          </div>
        </Card>

        {/* ② Shoot amounts */}
        <Card
          title="Shoot amounts"
          hint="How much time and content — everything below multiplies against these."
          onReset={() => set({ pageMinutes: 0, fullDays: 0, halfDays: 0, hours: 0, droneHours: 0, shorts: 0 })}
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Amount label="Page / minutes" value={s.pageMinutes} onChange={(v) => set({ pageMinutes: v })} hint="drives pre & post" />
            <Amount label="Full days" value={s.fullDays} onChange={(v) => set({ fullDays: v })} />
            <Amount label="Half days" value={s.halfDays} onChange={(v) => set({ halfDays: v })} />
            <Amount label="Hours" value={s.hours} onChange={(v) => set({ hours: v })} />
            <Amount label="Drone hours" value={s.droneHours} onChange={(v) => set({ droneHours: v })} />
            <Amount label="Shorts" value={s.shorts} onChange={(v) => set({ shorts: v })} />
          </div>
        </Card>

        {/* ③ Production crew */}
        <Card
          title="Production crew"
          hint="Check who's on the shoot. Rates come from Settings → Pricing engine."
          onReset={() => set({ roles: {} })}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {roles.map((role) => {
              const sel = s.roles[role.id];
              return (
                <div key={role.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${sel ? 'border-teal/50 bg-teal/5' : 'border-slate-200'}`}>
                  <label className="flex flex-1 cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked={!!sel} onChange={() => toggleRole(role.id)} className="h-4 w-4 accent-teal" />
                    <span className="text-sm text-slate-800">{role.name}</span>
                  </label>
                  {sel && role.kind === 'photographer' && (
                    <select
                      aria-label={`${role.name} booking`}
                      value={sel.booking ?? 'half'}
                      onChange={(e) => setRole(role.id, { booking: e.target.value as PhotographerBooking })}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                    >
                      <option value="day">Full day</option>
                      <option value="half">Half day</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  )}
                  {sel && role.has_quantity && (
                    <Stepper value={sel.quantity} onChange={(v) => setRole(role.id, { quantity: v })} label={`${role.name} quantity`} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ④ Rental gear */}
        <Card
          title="Equipment rental"
          hint="Added at list price (no markup), exactly like the sheet."
          onReset={() => set({ rental: 'none' })}
        >
          <div className="flex flex-wrap gap-2">
            {rentalTiers.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => set({ rental: t.value })}
                className={`rounded-xl border px-3.5 py-2 text-sm transition-colors ${s.rental === t.value ? 'border-teal bg-teal/10 font-medium text-sea' : 'border-slate-200 text-slate-600 hover:border-teal/50'}`}
              >
                {t.label}{t.value !== 'none' && <span className="ml-1.5 text-xs text-slate-400">{money(t.price)}</span>}
              </button>
            ))}
          </div>
        </Card>

        {/* ⑤⑥ Pre & Post production */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card
            title="Pre-production"
            hint={s.pageMinutes === 0 ? 'Set page/minutes above for these to count.' : `Billed per page/minute (×${s.pageMinutes}).`}
            onReset={() => {
              const preIds = new Set(preServices.map((x) => x.id));
              setS((prev) => ({ ...prev, serviceIds: prev.serviceIds.filter((id) => !preIds.has(id)) }));
            }}
          >
            <ServiceChecks services={preServices} selected={s.serviceIds} onToggle={toggleService} />
          </Card>
          <Card
            title="Post-production"
            hint={s.pageMinutes === 0 ? 'Set page/minutes above for these to count.' : `Billed per page/minute (×${s.pageMinutes}).`}
            onReset={() => {
              const postIds = new Set(postServices.map((x) => x.id));
              setS((prev) => ({ ...prev, serviceIds: prev.serviceIds.filter((id) => !postIds.has(id)), aboutUs: false }));
            }}
          >
            <ServiceChecks services={postServices} selected={s.serviceIds} onToggle={toggleService} />
            <label className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2">
              <input type="checkbox" checked={s.aboutUs} onChange={() => set({ aboutUs: !s.aboutUs })} className="h-4 w-4 accent-teal" />
              <span className="text-sm text-slate-800">“About Us” video</span>
              <span className="ml-auto text-xs text-slate-400">{money((config['about_us_fee'] ?? 0))} flat</span>
            </label>
          </Card>
        </div>

        {/* ⑦⑧ Travel + discounts + notes */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card title="Travel / Food" hint="Passed through at cost — not marked up." onReset={() => set({ travel: 0 })}>
            <div className="relative w-40">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
              <input
                type="number" min="0" step="1" value={s.travel || ''}
                onChange={(e) => set({ travel: num(e.target.value) })}
                placeholder="0" aria-label="Travel and food dollars"
                className={`${field} pl-7`}
              />
            </div>
          </Card>
          <Card title="Discounts" hint="Stack together, off the overall total." onReset={() => set({ discounts: [] })}>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DISCOUNT_LABELS) as DiscountKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleDiscount(key)}
                  className={`rounded-xl border px-3.5 py-2 text-sm transition-colors ${s.discounts.includes(key) ? 'border-teal bg-teal/10 font-medium text-sea' : 'border-slate-200 text-slate-600 hover:border-teal/50'}`}
                >
                  {DISCOUNT_LABELS[key]} <span className="ml-1 text-xs text-slate-400">−{config[`discount_${key}`] ?? 0}%</span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Notes">
          <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ''} placeholder="Terms, assumptions, anything the client should know…" className={`${field} w-full`} />
        </Card>

        {state.error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.error}</p>
        )}
      </div>

      {/* Live summary — sticky on wide screens */}
      <aside className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Totals</h2>
        <SummaryRow label="Production" value={q.production} />
        <SummaryRow label="Pre-production" value={q.pre} />
        <SummaryRow label="Post-production" value={q.post} />
        <SummaryRow label="Travel / Food" value={q.travel} />
        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-medium text-slate-800">
          <span>Overall total</span><span>{money(q.overall)}</span>
        </div>
        {q.discountPct > 0 && (
          <div className="flex items-center justify-between text-sm text-emerald-700">
            <span>Discount</span><span>−{Math.round(q.discountPct * 100)}%</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-slate-900">
          <span>Total</span><span>{money(q.total)}</span>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          <SaveButton editing={!!initial} />
          {initial && (
            <a href="/calculator" className="text-center text-sm text-slate-500 hover:text-slate-700">Cancel editing</a>
          )}
          {!initial && (
            <ResetAllButton
              onReset={() => {
                // Wipe the whole calculator AND the saved draft — a true blank slate.
                setS(emptySelections());
                setClientId('');
                setProjectId('');
                setTitle('');
                try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
              }}
            />
          )}
        </div>
      </aside>
    </form>
  );
}

// Reset EVERYTHING (selections, client, project, title, and the saved draft).
// Two-step confirm so one stray click can't wipe a half-built quote.
function ResetAllButton({ onReset }: { onReset: () => void }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-center text-sm text-slate-400 transition-colors hover:text-red-600"
      >
        Reset calculator
      </button>
    );
  }
  return (
    <div className="flex items-center justify-center gap-3 text-sm">
      <span className="text-slate-500">Clear everything?</span>
      <button
        type="button"
        onClick={() => { onReset(); setConfirming(false); }}
        className="font-medium text-red-600 hover:underline"
      >
        Reset
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-slate-400 hover:text-slate-600">
        Cancel
      </button>
    </div>
  );
}

// Quick-add a client without leaving the calculator. Not a nested <form> (we're
// already inside the save form) — it calls the server action directly.
function QuickAddClient({ onCreated }: { onCreated: (c: ClientOption) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1.5 self-start text-xs font-medium text-sea hover:underline">
        + New client
      </button>
    );
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await quickCreateClient({ name, company });
      if (res.ok) {
        onCreated(res.client);
        setOpen(false);
        setName('');
        setCompany('');
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" className={field} aria-label="New client name" />
      <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className={field} aria-label="New client company" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={pending || !name.trim()}
          onClick={submit}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? 'Adding…' : 'Add client'}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null); }} className="text-xs text-slate-500 hover:text-slate-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

// --- small building blocks ---------------------------------------------------

function Card({ title, hint, onReset, children }: { title: string; hint?: string; onReset?: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {onReset && (
          <button type="button" onClick={onReset} className="text-xs font-medium text-slate-400 transition-colors hover:text-sea">
            Reset
          </button>
        )}
      </div>
      {hint && <p className="mb-3 mt-0.5 text-xs text-slate-400">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Labeled({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Amount({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input
        type="number" min="0" step="0.5" value={value || ''}
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
        placeholder="0"
        className={field}
      />
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1">
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(1, value - 1))} className="px-1.5 py-0.5 text-slate-400 hover:text-slate-700">−</button>
      <span className="min-w-5 text-center text-sm text-slate-800">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(999, value + 1))} className="px-1.5 py-0.5 text-slate-400 hover:text-slate-700">+</button>
    </span>
  );
}

function ServiceChecks({ services, selected, onToggle }: { services: PageService[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {services.map((svc) => (
        <label key={svc.id} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${selected.includes(svc.id) ? 'border-teal/50 bg-teal/5' : 'border-slate-200'}`}>
          <input type="checkbox" checked={selected.includes(svc.id)} onChange={() => onToggle(svc.id)} className="h-4 w-4 accent-teal" />
          <span className="text-sm text-slate-800">{svc.name}</span>
          <span className="ml-auto text-xs text-slate-400">{money(svc.page_rate)}/page-min</span>
        </label>
      ))}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <span>{label}</span><span>{money(value)}</span>
    </div>
  );
}
