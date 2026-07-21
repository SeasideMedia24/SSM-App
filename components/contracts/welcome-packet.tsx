// The welcome packet a client sees right after signing (and reusable in the
// future client portal). Three things, per the owner's SOP: project scope,
// payment terms, and a milestone timeline — plus a CTA to pay the deposit.

import { money, fmtDate } from '@/lib/projects/format';
import type { Deliverable } from '@/lib/contracts/template';

export type WelcomePacketProps = {
  signerName: string | null;
  projectTitle: string;
  deliverables: Deliverable[];
  depositAmount: number;
  productionAmount: number;
  deliveryAmount: number;
  depositInvoiceUrl: string | null;
  portalUrl?: string | null; // the client's project hub, if a link exists
};

export function WelcomePacket(p: WelcomePacketProps) {
  const steps = [
    { label: 'Agreement signed', detail: 'Thank you — we’re official!', done: true },
    { label: 'Deposit', detail: `${money(p.depositAmount)} due now to lock your dates`, done: false },
    { label: 'Production', detail: `${money(p.productionAmount)} due after the shoot day`, done: false },
    { label: 'Delivery', detail: `${money(p.deliveryAmount)} due on final delivery`, done: false },
  ];

  return (
    <div className="mt-8 flex flex-col gap-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-2xl">🎉</p>
        <h2 className="mt-1 text-lg font-semibold text-emerald-900">
          Welcome to Seaside Media{p.signerName ? `, ${p.signerName.split(' ')[0]}` : ''}!
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          Your agreement for <span className="font-medium">{p.projectTitle}</span> is signed. Here’s what happens next.
        </p>
      </div>

      {p.depositInvoiceUrl && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-ink">Your deposit invoice is ready</p>
            <p className="text-sm text-slate-500">Pay {money(p.depositAmount)} to lock in your production dates.</p>
          </div>
          <a
            href={p.depositInvoiceUrl}
            target="_blank"
            rel="noreferrer"
            className="brand-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110"
          >
            View deposit invoice
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Scope */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Project scope</h3>
          {p.deliverables.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {p.deliverables.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                  <span className="flex-1">{d.title}</span>
                  {d.due && <span className="whitespace-nowrap text-xs text-slate-400">due {fmtDate(d.due)}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-400">Deliverables will be confirmed at the kickoff.</p>
          )}
        </section>

        {/* Payment timeline */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-ink">Payment timeline</h3>
          <ol className="mt-3 flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${s.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {s.done ? '✓' : i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{s.label}</p>
                  <p className="text-xs text-slate-500">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {p.portalUrl && (
        <a
          href={p.portalUrl}
          className="brand-gradient mx-auto rounded-xl px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110"
        >
          Continue to your project hub →
        </a>
      )}

      <p className="text-center text-xs text-slate-400">
        Questions? Reach us at jeremy@seasidemedia.co — we’ll be in touch to schedule your creative kickoff.
      </p>
    </div>
  );
}
