import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { ContractEditor } from '@/components/contracts/contract-editor';
import { DeleteContractButton } from '@/components/contracts/delete-contract-button';
import { contractStatusMeta } from '@/lib/projects/status';
import type { ContractStatus } from '@/types/database.types';

type Rel<T> = T | T[] | null;
const one = <T,>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);

export default async function ContractEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: c } = await supabase
    .from('contracts')
    .select('*, projects ( id, title, clients ( id, name, company ) )')
    .eq('id', id)
    .single();
  if (!c) notFound();

  const project = one(c.projects as Rel<{ id: string; title: string; clients: Rel<{ id: string; name: string; company: string | null }> }>);
  const client = project ? one(project.clients) : null;
  const meta = contractStatusMeta(c.status as ContractStatus);

  return (
    <>
      <PageHeader
        title={c.title}
        description="Review the terms, watch the document build, then send it to your client to sign."
        action={<DeleteContractButton contractId={c.id} projectId={c.project_id} />}
      />

      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${meta.pill}`}>{meta.label}</span>
        {project && <Link href={`/projects/${project.id}`} className="text-slate-500 hover:text-sea hover:underline">{project.title}</Link>}
        {client && <Link href={`/clients/${client.id}`} className="text-slate-600 hover:text-sea hover:underline">{client.name}</Link>}
        {c.quote_id && (
          <Link href={`/calculator?quote=${c.quote_id}`} className="text-xs text-slate-400 hover:text-sea hover:underline">from quote</Link>
        )}
      </div>

      <ContractEditor
        contract={{
          id: c.id,
          project_id: c.project_id,
          title: c.title,
          status: c.status as ContractStatus,
          effective_date: c.effective_date,
          deposit_amount: c.deposit_amount,
          production_amount: c.production_amount,
          delivery_amount: c.delivery_amount,
          revision_rounds: c.revision_rounds,
          revision_pct: c.revision_pct,
          deliverables_snapshot: Array.isArray(c.deliverables_snapshot) ? (c.deliverables_snapshot as string[]) : [],
          share_token: c.share_token,
          body_md: c.body_md,
          signer_name: c.signer_name,
          signer_title: c.signer_title,
          signed_at: c.signed_at,
          deposit_invoice_id: c.deposit_invoice_id,
        }}
        clientName={client?.name ?? ''}
        clientCompany={client?.company ?? null}
        projectTitle={project?.title ?? ''}
      />
    </>
  );
}
