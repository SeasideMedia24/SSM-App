// Public, client-facing contract at a private unguessable link. The owner sends
// /contract/<token> from the contract editor. The visitor is anonymous, so the
// lookup uses the admin client (RLS stays locked for anon); only the single
// contract matching the token is exposed. Unsigned → shows the signing panel;
// signed → shows the Welcome Packet.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeDeliverables } from '@/lib/contracts/template';
import { SignForm } from './sign-form';
import { WelcomePacket } from '@/components/contracts/welcome-packet';

export const metadata = { title: 'Your agreement — Seaside Media' };

type ProjRel =
  | { title: string; clients: { name: string; company: string | null } | { name: string; company: string | null }[] | null }
  | { title: string; clients: unknown }[]
  | null;
const one = <T,>(r: T | T[] | null): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

const md = {
  h1: (p: React.ComponentProps<'h1'>) => <h1 className="mb-3 mt-1 text-2xl font-semibold text-ink" {...p} />,
  h2: (p: React.ComponentProps<'h2'>) => <h2 className="mb-1 mt-5 text-lg font-semibold text-ink" {...p} />,
  p: (p: React.ComponentProps<'p'>) => <p className="mb-2.5 text-sm leading-relaxed text-slate-700" {...p} />,
  ul: (p: React.ComponentProps<'ul'>) => <ul className="mb-2.5 ml-5 list-disc text-sm text-slate-700" {...p} />,
  ol: (p: React.ComponentProps<'ol'>) => <ol className="mb-2.5 ml-5 list-decimal text-sm text-slate-700" {...p} />,
  li: (p: React.ComponentProps<'li'>) => <li className="mb-1" {...p} />,
  strong: (p: React.ComponentProps<'strong'>) => <strong className="font-semibold text-ink" {...p} />,
  em: (p: React.ComponentProps<'em'>) => <em className="text-slate-500" {...p} />,
};

function InactiveLink() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="font-display text-2xl tracking-wide text-ink">SEASIDE MEDIA</p>
        <h1 className="mt-4 text-lg font-semibold text-ink">This contract link isn’t active</h1>
        <p className="mt-2 text-sm text-slate-500">
          It may have been replaced or removed. Please reach out to Seaside Media for a fresh link.
        </p>
      </div>
    </main>
  );
}

export default async function SharedContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: contract } = await admin
    .from('contracts')
    .select('id, status, body_md, signer_name, project_id, deposit_amount, production_amount, delivery_amount, deliverables_snapshot, deposit_invoice_id, projects ( title, clients ( name, company ) )')
    .eq('share_token', token)
    .single();

  if (!contract || !contract.body_md) return <InactiveLink />;

  const project = one(contract.projects as ProjRel) as { title: string; clients: unknown } | null;
  const projectTitle = project?.title ?? 'Your project';
  const signed = contract.status === 'signed';
  const deliverables = normalizeDeliverables(contract.deliverables_snapshot);

  // For the welcome packet's "pay deposit" CTA, resolve the invoice's public link.
  let depositInvoiceUrl: string | null = null;
  let portalUrl: string | null = null;
  if (signed && contract.deposit_invoice_id) {
    const { data: inv } = await admin
      .from('invoices')
      .select('share_token')
      .eq('id', contract.deposit_invoice_id)
      .single();
    if (inv?.share_token) depositInvoiceUrl = `/invoice/${inv.share_token}`;
  }
  // If the owner has opened the client portal for this project, offer it next.
  if (signed && contract.project_id) {
    const { data: portal } = await admin
      .from('client_portal')
      .select('portal_token')
      .eq('project_id', contract.project_id)
      .maybeSingle();
    if (portal?.portal_token) portalUrl = `/portal/${portal.portal_token}`;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        {/* The document */}
        <div className="rounded-2xl bg-white p-10 shadow-sm ring-1 ring-slate-200 print:rounded-none print:p-0 print:shadow-none print:ring-0">
          <header className="mb-6 flex items-center justify-between border-b border-slate-200 pb-6">
            <div>
              <p className="font-display text-3xl tracking-wide text-ink">SEASIDE MEDIA</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.25em] text-sea">Video Production</p>
            </div>
            {signed && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Signed ✓</span>}
          </header>

          <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>{contract.body_md}</ReactMarkdown>
        </div>

        {/* Sign, or (once signed) the welcome packet */}
        {signed ? (
          <WelcomePacket
            signerName={contract.signer_name}
            projectTitle={projectTitle}
            deliverables={deliverables}
            depositAmount={Number(contract.deposit_amount ?? 0)}
            productionAmount={Number(contract.production_amount ?? 0)}
            deliveryAmount={Number(contract.delivery_amount ?? 0)}
            depositInvoiceUrl={depositInvoiceUrl}
            portalUrl={portalUrl}
          />
        ) : (
          <div className="print:hidden">
            <SignForm token={token} />
          </div>
        )}
      </div>
    </main>
  );
}
