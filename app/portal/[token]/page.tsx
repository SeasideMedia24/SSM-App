// The client's private project hub at /portal/<token>. Anonymous (clients have
// no logins), so the lookup uses the admin client and is gated entirely by the
// unguessable token — RLS stays locked for anon. Sections: overview (reuses the
// welcome packet), creative kickoff (2b), brand & assets (2c), and how revisions
// work (from the signed contract).

import { createAdminClient } from '@/lib/supabase/admin';
import { BrandLogo } from '@/components/brand-logo';
import { normalizeDeliverables } from '@/lib/contracts/template';
import { freeBusy } from '@/lib/google/calendar';
import { generateSlots, KICKOFF_CONFIG } from '@/lib/scheduling/slots';
import { WelcomePacket } from '@/components/contracts/welcome-packet';
import { KickoffBooking } from '@/components/portal/kickoff-booking';
import { BrandAssets, type Brand, type Tech } from '@/components/portal/brand-assets';
import { ProgressStepper, ProjectTimeline, type TimelineEntry } from '@/components/portal/project-progress';
import { money } from '@/lib/projects/format';
import type { ProjectStatus, TaskStatus } from '@/types/database.types';

export const metadata = { title: 'Your project hub — Seaside Media' };

const one = <T,>(r: T | T[] | null): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

function InactiveLink() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <BrandLogo size="sm" tagline={false} className="justify-center" />
        <h1 className="mt-4 text-lg font-semibold text-ink">This project link isn’t active</h1>
        <p className="mt-2 text-sm text-slate-500">
          It may have been replaced or removed. Please reach out to Seaside Media for a fresh link.
        </p>
      </div>
    </main>
  );
}

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: portal } = await admin
    .from('client_portal')
    .select('project_id, kickoff_at, kickoff_link, submitted_at, brand, tech, links')
    .eq('portal_token', token)
    .maybeSingle();

  if (!portal) return <InactiveLink />;

  const { data: assetRows } = await admin
    .from('portal_assets')
    .select('id, filename')
    .eq('project_id', portal.project_id)
    .order('created_at');
  const assets = (assetRows ?? []).map((a) => ({ id: a.id, filename: a.filename }));
  const links = Array.isArray(portal.links) ? (portal.links as string[]) : [];

  const { data: project } = await admin
    .from('projects')
    .select('id, title, status, clients ( name )')
    .eq('id', portal.project_id)
    .maybeSingle();
  const client = one(project?.clients as { name: string } | { name: string }[] | null);
  const projectTitle = project?.title ?? 'Your project';

  // The signed contract drives the overview + revision terms + payments.
  const { data: contract } = await admin
    .from('contracts')
    .select('deliverables_snapshot, deposit_amount, production_amount, delivery_amount, revision_rounds, revision_pct, signer_name, share_token, deposit_invoice_id')
    .eq('project_id', portal.project_id)
    .eq('status', 'signed')
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Timeline = milestones + the project's live deliverables (statuses included).
  const [{ data: milestoneRows }, { data: deliverableRows }] = await Promise.all([
    admin.from('milestones').select('title, date, status').eq('project_id', portal.project_id).order('position'),
    admin.from('deliverables').select('title, due_date, status').eq('project_id', portal.project_id).order('position'),
  ]);
  const timeline: TimelineEntry[] = [
    ...(milestoneRows ?? []).map((m) => ({ title: m.title, date: m.date, status: m.status as TaskStatus, kind: 'milestone' as const })),
    ...(deliverableRows ?? []).map((d) => ({ title: d.title, date: d.due_date, status: d.status as TaskStatus, kind: 'deliverable' as const })),
  ];

  // Deposit invoice — the client's payment link (opens in a new tab).
  let depositInvoiceUrl: string | null = null;
  let depositInvoice: { total: number; status: string } | null = null;
  let payNowUrl: string | null = null;
  if (contract?.deposit_invoice_id) {
    const { data: inv } = await admin
      .from('invoices')
      .select('share_token, total, status, qbo_payment_link')
      .eq('id', contract.deposit_invoice_id)
      .maybeSingle();
    if (inv) {
      depositInvoice = { total: Number(inv.total), status: inv.status };
      if (inv.share_token) depositInvoiceUrl = `/invoice/${inv.share_token}`;
      payNowUrl = inv.qbo_payment_link; // QB's hosted pay page (card/ACH)
    }
  }

  const deliverables = normalizeDeliverables(contract?.deliverables_snapshot);
  const rounds = contract?.revision_rounds ?? 2;
  const pct = contract?.revision_pct ?? 100;

  // Kickoff: show the confirmed booking, or compute open slots from the owner's
  // real availability (empty if Google isn't connected — the picker then invites
  // the client to reach out).
  const booked = portal.kickoff_at ? { at: portal.kickoff_at, link: portal.kickoff_link } : null;
  let slots: import('@/lib/scheduling/slots').Slot[] = [];
  if (!booked) {
    const now = new Date();
    const timeMax = new Date(now.getTime() + (KICKOFF_CONFIG.horizonDays + 1) * 86_400_000);
    const fb = await freeBusy(admin, { timeMin: now.toISOString(), timeMax: timeMax.toISOString() });
    if (fb.ok) slots = generateSlots(now, fb.busy, KICKOFF_CONFIG).slice(0, 40);
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <BrandLogo size="lg" tagline={false} className="justify-center" />
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.25em] text-sea">Your project hub</p>
          <h1 className="mt-4 text-xl font-semibold text-ink">
            {client?.name ? `Welcome, ${client.name.split(' ')[0]}` : 'Welcome'} — {projectTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Everything for your project in one place — progress, payments, timeline, and how we’ll work together.
          </p>
          {project?.status && (
            <div className="mt-5 flex justify-center border-t border-slate-100 pt-4">
              <ProgressStepper status={project.status as ProjectStatus} />
            </div>
          )}
        </header>

        {/* Overview: scope + payment timeline (reuses the welcome packet) */}
        {contract && (
          <WelcomePacket
            signerName={contract.signer_name}
            projectTitle={projectTitle}
            deliverables={deliverables}
            depositAmount={Number(contract.deposit_amount ?? 0)}
            productionAmount={Number(contract.production_amount ?? 0)}
            deliveryAmount={Number(contract.delivery_amount ?? 0)}
            depositInvoiceUrl={depositInvoiceUrl}
          />
        )}

        {/* Payments — the deposit invoice, front and center */}
        {depositInvoice && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Payments</h2>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink">Deposit — {money(depositInvoice.total)}</p>
                <p className="text-xs text-slate-500">
                  {depositInvoice.status === 'paid' ? 'Paid — thank you!' : 'Due now to lock your production dates.'}
                </p>
              </div>
              {depositInvoice.status !== 'paid' && (
                <div className="flex flex-wrap items-center gap-3">
                  {payNowUrl ? (
                    <a
                      href={payNowUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="brand-gradient rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110"
                    >
                      Pay deposit now →
                    </a>
                  ) : depositInvoiceUrl ? (
                    <a
                      href={depositInvoiceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="brand-gradient rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110"
                    >
                      View & pay deposit
                    </a>
                  ) : null}
                  {payNowUrl && depositInvoiceUrl && (
                    <a href={depositInvoiceUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-sea hover:underline">
                      View invoice
                    </a>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Project timeline */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Project timeline</h2>
          <p className="mb-4 mt-0.5 text-xs text-slate-400">Milestones and deliveries, updated as we go.</p>
          <ProjectTimeline entries={timeline} />
        </section>

        {/* Creative kickoff — self-serve booking against the owner's calendar */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Book your creative kickoff</h2>
          <p className="mb-3 mt-0.5 text-xs text-slate-400">
            A 45-minute call to align on direction, audience, and deliverables before we start.
          </p>
          <KickoffBooking token={token} slots={slots} booked={booked} />
        </section>

        {/* Brand & asset collection */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Your brand & assets</h2>
          <p className="mb-4 mt-0.5 text-xs text-slate-400">
            Share your brand details and files so nothing gets lost in email. Save anytime — it’s all in one place.
          </p>
          <BrandAssets
            token={token}
            initialBrand={(portal.brand as Brand) ?? {}}
            initialTech={(portal.tech as Tech) ?? {}}
            initialLinks={links}
            initialAssets={assets}
            submittedAt={portal.submitted_at}
          />
        </section>

        {/* Review & revisions (from the signed contract) */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">How revisions work</h2>
          <p className="mt-2 text-sm text-slate-700">
            Your package includes <span className="font-medium">{rounds} round{rounds === 1 ? '' : 's'}</span> of revisions,
            each covering up to <span className="font-medium">{pct}%</span> of the video. We’ll share each draft for your
            time-coded feedback, make the changes together, and lock it once you’re happy. Extra rounds beyond your package
            are quoted before any work begins — no surprises.
          </p>
        </section>

        {/* Your agreement */}
        {contract?.share_token && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">Your agreement</h2>
            <p className="mb-3 mt-0.5 text-xs text-slate-400">The signed contract for this project, any time you need it.</p>
            <div className="flex flex-wrap gap-3">
              <a
                href={`/contract/${contract.share_token}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-teal hover:text-sea"
              >
                View signed contract
              </a>
              <a
                href={`/contract/${contract.share_token}/pdf`}
                className="inline-block rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-teal hover:text-sea"
              >
                Download PDF
              </a>
            </div>
          </section>
        )}

        {/* Questions — no dead ends */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Questions? We’ve got you.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Anything about your project — timeline, payments, the shoot, a new idea — just reach out and we’ll get right back to you.
          </p>
          <a
            href="mailto:jeremy@seasidemedia.co"
            className="mt-4 inline-block rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Email jeremy@seasidemedia.co
          </a>
        </section>

        <footer className="mt-8 text-center text-xs text-slate-400">
          Seaside Media · Video Production · seasidemedia.co
        </footer>
      </div>
    </main>
  );
}
