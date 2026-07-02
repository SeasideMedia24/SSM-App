import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalTable, GlobalEmpty, proj, type ProjRel } from '@/components/projects/global-table';
import { contractStatusMeta } from '@/lib/projects/status';
import { money, fmtDate } from '@/lib/projects/format';

export default async function AllContractsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('contracts')
    .select('id, title, status, amount, signed_date, projects(id, title)')
    .order('created_at', { ascending: false });

  const rows = data ?? [];

  return (
    <>
      <PageHeader title="Contracts" description="Every contract across all projects." />
      {rows.length === 0 ? (
        <GlobalEmpty>No contracts yet. They’re created inside each project.</GlobalEmpty>
      ) : (
        <GlobalTable headers={['Contract', 'Project', 'Status', 'Amount', 'Signed']}>
          {rows.map((c) => {
            const p = proj(c.projects as ProjRel);
            const meta = contractStatusMeta(c.status);
            return (
              <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-ink">{c.title}</td>
                <td className="px-4 py-3">
                  {p && <Link href={`/projects/${p.id}?view=contracts`} className="text-slate-600 hover:text-sea hover:underline">{p.title}</Link>}
                </td>
                <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${meta.pill}`}>{meta.label}</span></td>
                <td className="px-4 py-3 text-slate-600">{c.amount != null ? money(c.amount) : '—'}</td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(c.signed_date) ?? '—'}</td>
              </tr>
            );
          })}
        </GlobalTable>
      )}
    </>
  );
}
