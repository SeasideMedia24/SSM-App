import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalTable, GlobalEmpty, proj, type ProjRel } from '@/components/projects/global-table';
import { taskStatusMeta } from '@/lib/projects/status';
import { fmtDate } from '@/lib/projects/format';

export default async function AllTimelinePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('milestones')
    .select('id, title, status, date, projects(id, title)')
    .order('date', { ascending: true, nullsFirst: false });

  const rows = data ?? [];

  return (
    <>
      <PageHeader title="Timeline" description="Milestones across all projects, by date." />
      {rows.length === 0 ? (
        <GlobalEmpty>No milestones yet. They’re created inside each project.</GlobalEmpty>
      ) : (
        <GlobalTable headers={['Date', 'Milestone', 'Project', 'Status']}>
          {rows.map((m) => {
            const p = proj(m.projects as ProjRel);
            const meta = taskStatusMeta(m.status);
            return (
              <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{fmtDate(m.date) ?? '—'}</td>
                <td className="px-4 py-3 text-ink">{m.title}</td>
                <td className="px-4 py-3">
                  {p && <Link href={`/projects/${p.id}?view=timeline`} className="text-slate-600 hover:text-sea hover:underline">{p.title}</Link>}
                </td>
                <td className="px-4 py-3"><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${meta.pill}`}>{meta.label}</span></td>
              </tr>
            );
          })}
        </GlobalTable>
      )}
    </>
  );
}
