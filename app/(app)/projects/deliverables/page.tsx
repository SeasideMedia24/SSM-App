import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalTable, GlobalEmpty, proj, type ProjRel } from '@/components/projects/global-table';
import { taskStatusMeta } from '@/lib/projects/status';
import { fmtDate } from '@/lib/projects/format';

export default async function AllDeliverablesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('deliverables')
    .select('id, title, status, due_date, projects(id, title)')
    .order('due_date', { ascending: true, nullsFirst: false });

  const rows = data ?? [];

  return (
    <>
      <PageHeader title="Deliverables" description="Every deliverable across all projects." />
      {rows.length === 0 ? (
        <GlobalEmpty>No deliverables yet. They’re created inside each project.</GlobalEmpty>
      ) : (
        <GlobalTable headers={['Deliverable', 'Project', 'Status', 'Due']}>
          {rows.map((d) => {
            const p = proj(d.projects as ProjRel);
            const meta = taskStatusMeta(d.status);
            return (
              <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-ink">{d.title}</td>
                <td className="px-4 py-3">
                  {p && <Link href={`/projects/${p.id}?view=deliverables`} className="text-slate-600 hover:text-sea hover:underline">{p.title}</Link>}
                </td>
                <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${meta.pill}`}>{meta.label}</span></td>
                <td className="px-4 py-3 text-slate-500">{fmtDate(d.due_date) ?? '—'}</td>
              </tr>
            );
          })}
        </GlobalTable>
      )}
    </>
  );
}
