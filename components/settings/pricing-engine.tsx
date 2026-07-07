'use client';

// Pricing engine manager for Settings — the rates behind the Price Calculator.
// Three groups: crew roles (day/half/hour), page-minute services (pre/post),
// and the single numbers (markup, rental tiers, discounts, fees).
// Each row is its own form; deletes confirm first and use React 19's
// formAction so no forms are nested (invalid HTML — browsers drop them).

import { useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  savePricingRole, deletePricingRole,
  savePricingService, deletePricingService,
  savePricingConfig, type PricingFormState,
} from '@/app/(app)/settings/actions';
import type { RoleRates, PageService, PricingConfig } from '@/lib/pricing/engine';

const field =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60">
      {pending ? 'Saving…' : label}
    </button>
  );
}

// Confirm-then-delete that lives INSIDE the row form (formAction, no nesting).
function DeleteControl({ deleteAction }: { deleteAction: (fd: FormData) => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs font-medium text-slate-400 hover:text-red-600">
        Delete
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button type="submit" formAction={deleteAction} formNoValidate className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500">
        Yes, delete
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs text-slate-500 hover:text-slate-700">
        Cancel
      </button>
    </span>
  );
}

// ---- Crew roles ---------------------------------------------------------------

function RoleRow({ role, onDone }: { role?: RoleRates; onDone?: () => void }) {
  const [state, action] = useActionState<PricingFormState, FormData>(
    async (prev, fd) => {
      const result = await savePricingRole(prev, fd);
      if (!result.error) onDone?.();
      return result;
    },
    { error: null },
  );

  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="grid grid-cols-[1fr_5.5rem_5.5rem_5.5rem_3.5rem_auto_auto] items-center gap-2">
        {role && <input type="hidden" name="id" value={role.id} />}
        <input name="name" defaultValue={role?.name ?? ''} placeholder="e.g. Steadicam Op" required className={field} />
        <input name="day_rate" type="number" min="0" step="0.01" defaultValue={role ? String(role.day_rate) : ''} placeholder="day" required className={field} disabled={role?.kind === 'drone'} />
        <input name="half_rate" type="number" min="0" step="0.01" defaultValue={role ? String(role.half_rate) : ''} placeholder="half" required className={field} disabled={role?.kind === 'drone'} />
        <input name="hour_rate" type="number" min="0" step="0.01" defaultValue={role ? String(role.hour_rate) : ''} placeholder="hour" required className={field} />
        <label className="flex items-center justify-center gap-1 text-xs text-slate-500" title="Can this role be booked ×N (e.g. 2 grips)?">
          <input type="checkbox" name="has_quantity" defaultChecked={role?.has_quantity ?? false} className="h-3.5 w-3.5 accent-teal" />
          ×N
        </label>
        <SaveButton label={role ? 'Save' : 'Add'} />
        {role ? <DeleteControl deleteAction={deletePricingRole} /> : (
          <button type="button" onClick={onDone} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
        )}
      </div>
      {role?.kind !== 'standard' && role && (
        <p className="text-[10px] text-slate-400">
          {role.kind === 'photographer' ? 'Photographer — booked by its own day/half/hourly choice on each quote.' : 'Drone — billed hourly against the quote’s drone hours.'}
        </p>
      )}
      {state.error && <p className="text-xs text-red-600" role="alert">{state.error}</p>}
    </form>
  );
}

// ---- Page services --------------------------------------------------------------

function ServiceRow({ svc, onDone }: { svc?: PageService; onDone?: () => void }) {
  const [state, action] = useActionState<PricingFormState, FormData>(
    async (prev, fd) => {
      const result = await savePricingService(prev, fd);
      if (!result.error) onDone?.();
      return result;
    },
    { error: null },
  );

  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="grid grid-cols-[1fr_7rem_7rem_auto_auto] items-center gap-2">
        {svc && <input type="hidden" name="id" value={svc.id} />}
        <input name="name" defaultValue={svc?.name ?? ''} placeholder="e.g. Motion graphics" required className={field} />
        <select name="phase" defaultValue={svc?.phase ?? 'post'} className={field}>
          <option value="pre">Pre-production</option>
          <option value="post">Post-production</option>
        </select>
        <input name="page_rate" type="number" min="0" step="0.01" defaultValue={svc ? String(svc.page_rate) : ''} placeholder="$/page-min" required className={field} />
        <SaveButton label={svc ? 'Save' : 'Add'} />
        {svc ? <DeleteControl deleteAction={deletePricingService} /> : (
          <button type="button" onClick={onDone} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
        )}
      </div>
      {state.error && <p className="text-xs text-red-600" role="alert">{state.error}</p>}
    </form>
  );
}

// ---- The numbers ---------------------------------------------------------------

// Label + help for each config knob, in display order.
const CONFIG_FIELDS: { key: string; label: string; suffix?: string }[] = [
  { key: 'markup', label: 'Markup (×)' },
  { key: 'rental_low', label: 'Rental — Low', suffix: '$' },
  { key: 'rental_medium_low', label: 'Rental — Medium Low', suffix: '$' },
  { key: 'rental_medium', label: 'Rental — Medium', suffix: '$' },
  { key: 'rental_high', label: 'Rental — High', suffix: '$' },
  { key: 'about_us_fee', label: '“About Us” fee', suffix: '$' },
  { key: 'short_rate', label: 'Per short (incl. editing)', suffix: '$' },
  { key: 'discount_referral', label: 'Referral discount', suffix: '%' },
  { key: 'discount_first_time', label: 'First Time discount', suffix: '%' },
  { key: 'discount_military', label: 'Military/Veteran discount', suffix: '%' },
];

function ConfigForm({ config }: { config: PricingConfig }) {
  const [state, action] = useActionState<PricingFormState, FormData>(savePricingConfig, { error: null });

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONFIG_FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">
              {f.label}{f.suffix && <span className="text-slate-400"> ({f.suffix})</span>}
            </span>
            <input name={f.key} type="number" min="0" step="0.01" defaultValue={String(config[f.key] ?? 0)} className={field} />
          </label>
        ))}
      </div>
      {state.error && <p className="text-xs text-red-600" role="alert">{state.error}</p>}
      <div>
        <SaveButton label="Save numbers" />
      </div>
    </form>
  );
}

// ---- The whole section ----------------------------------------------------------

export function PricingEngine({ roles, services, config }: { roles: RoleRates[]; services: PageService[]; config: PricingConfig }) {
  const [addingRole, setAddingRole] = useState(false);
  const [addingService, setAddingService] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Crew rates</h3>
        <p className="mb-4 mt-0.5 text-xs text-slate-400">
          Per person, before the markup. Changing a rate affects new quotes only.
        </p>
        <div className="mb-1.5 grid grid-cols-[1fr_5.5rem_5.5rem_5.5rem_3.5rem_auto_auto] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          <span>Role</span><span>Day</span><span>Half</span><span>Hour</span><span className="text-center">Qty</span><span /><span />
        </div>
        <div className="flex flex-col gap-2">
          {roles.map((r) => <RoleRow key={`${r.id}-${r.day_rate}-${r.half_rate}-${r.hour_rate}-${r.has_quantity}`} role={r} />)}
          {addingRole ? (
            <RoleRow onDone={() => setAddingRole(false)} />
          ) : (
            <div>
              <button type="button" onClick={() => setAddingRole(true)} className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea">
                + Add role
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Pre / Post services</h3>
        <p className="mb-4 mt-0.5 text-xs text-slate-400">
          Billed per page-minute of the project, before markup.
        </p>
        <div className="flex flex-col gap-2">
          {services.map((s) => <ServiceRow key={`${s.id}-${s.page_rate}-${s.phase}`} svc={s} />)}
          {addingService ? (
            <ServiceRow onDone={() => setAddingService(false)} />
          ) : (
            <div>
              <button type="button" onClick={() => setAddingService(true)} className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea">
                + Add service
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">The numbers</h3>
        <p className="mb-4 mt-0.5 text-xs text-slate-400">
          Markup multiplies crew and pre/post work. Rental and travel are added at cost. Discounts stack.
        </p>
        <ConfigForm config={config} />
      </div>
    </div>
  );
}
