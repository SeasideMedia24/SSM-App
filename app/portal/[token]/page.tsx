// The client's private project hub at /portal/<token>. Anonymous (clients have
// no logins), so the lookup uses the admin client and is gated entirely by the
// unguessable token — RLS stays locked for anon. Sections: overview (reuses the
// welcome packet), creative kickoff (2b), brand & assets (2c), and how revisions
// work (from the signed contract).

import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeDeliverables } from '@/lib/contracts/template';
import { freeBusy } from '@/lib/google/calendar';
import { generateSlots, KICKOFF_CONFIG } from '@/lib/scheduling/slots';
import { WelcomePacket } from '@/components/contracts/welcome-packet';
import { KickoffBooking } from '@/components/portal/kickoff-booking';

export const metadata = { title: 'Your project hub — Seaside Media' };

const one = <T,>(r: T | T[] | null): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

function InactiveLink() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="font-display text-2xl tracking-wide text-ink">SEASIDE MEDIA</p>
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
    .select('project_id, kickoff_at, kickoff_link, submitted_at')
    .eq('portal_token', token)
    .maybeSingle();

  if (!portal) return <InactiveLink />;

  const { data: project } = await admin
    .from('projects')
    .select('id, title, clients ( name )')
    .eq('id', portal.project_id)
    .maybeSingle();
  const client = one(project?.clients as { name: string } | { name: string }[] | null);
  const projectTitle = project?.title ?? 'Your project';

  // The signed contract drives the overview + revision terms.
  const { data: contract } = await admin
    .from('contracts')
    .select('deliverables_snapshot, deposit_amount, production_amount, delivery_amount, revision_rounds, revision_pct, signer_name')
    .eq('project_id', portal.project_id)
    .eq('status', 'signed')
    .order('signed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

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
          <p className="font-display text-3xl tracking-wide text-ink">SEASIDE MEDIA</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.25em] text-sea">Your project hub</p>
          <h1 className="mt-4 text-xl font-semibold text-ink">
            {client?.name ? `Welcome, ${client.name.split(' ')[0]}` : 'Welcome'} — {projectTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Everything for your project in one place. Book your kickoff, share your brand assets, and see how revisions work.
          </p>
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
            depositInvoiceUrl={null}
          />
        )}

        {/* Creative kickoff — self-serve booking against the owner's calendar */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Book your creative kickoff</h2>
          <p className="mb-3 mt-0.5 text-xs text-slate-400">
            A 45-minute call to align on direction, audience, and deliverables before we start.
          </p>
          <KickoffBooking token={token} slots={slots} booked={booked} />
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

        <footer className="mt-8 text-center text-xs text-slate-400">
          Questions? Reach us at jeremy@seasidemedia.co
        </footer>
      </div>
    </main>
  );
}
