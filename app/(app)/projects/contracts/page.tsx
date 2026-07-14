import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalTable, GlobalEmpty, proj, type ProjRel } from '@/components/projects/global-table';
import { RowLink } from '@/components/projects/row-link';
import { NewContractControl } from '@/components/contracts/new-contract-control';
import { contractStatusMeta } from '@/lib/projects/status';
import { money, fmtDate } from '@/lib/projects/format';

export default async function AllContractsPage() {
  const supabase = await createClient();
  const [{ data }, { data: projects }] = await Promise.all([
    supabase
      .from('contracts')
      .select('id, title, status, amount, signed_date, projects(id, title)')
      .order('created_at', { ascending: false }),
    supabase.from('projects').select('id, title').neq('status', 'archived').order('title'),
  ]);

  const rows = data ?? [];

  return (
    <>
      <PageHeader
        title="Contracts"
        description="Every contract across all projects."
        action={<NewContractControl projects={projects ?? []} />}
      />
      {rows.length === 0 ? (
        <GlobalEmpty>No contracts yet — add one with “New contract”, or from inside a project.</GlobalEmpty>
      ) : (
        <GlobalTable headers={['Contract', 'Project', 'Status', 'Amount', 'Signed']}>
          {rows.map((c) => {
            const p = proj(c.projects as ProjRel);
            const meta = contractStatusMeta(c.status);
            // The whole row opens the contract editor / signing document.
            return (
              <RowLink key={c.id} href={`/contracts/${c.id}`}>
                <td className="px-4 py-3 font-medium text-ink">{c.title}</td>
                <td className="px-4 py-3 text-slate-600">{p?.title ?? '—'}</td>
                <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${meta.pill}`}>{meta.label}</span></td>
                <td className="px-4 py-3 text-slate-600">{c.amount != null ? money(c.amount) : '—'}</td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(c.signed_date) ?? '—'}</td>
              </RowLink>
            );
          })}
        </GlobalTable>
      )}
    </>
  );
}
