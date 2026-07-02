import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalTable, GlobalEmpty, proj, type ProjRel } from '@/components/projects/global-table';
import { money } from '@/lib/projects/format';

export default async function AllBudgetsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('budget_lines')
    .select('planned_amount, actual_amount, projects(id, title)');

  // Roll up planned/actual per project.
  const byProject = new Map<string, { id: string; title: string; planned: number; actual: number }>();
  for (const row of data ?? []) {
    const p = proj(row.projects as ProjRel);
    if (!p) continue;
    const cur = byProject.get(p.id) ?? { id: p.id, title: p.title, planned: 0, actual: 0 };
    cur.planned += row.planned_amount ?? 0;
    cur.actual += row.actual_amount ?? 0;
    byProject.set(p.id, cur);
  }
  const projects = [...byProject.values()].sort((a, b) => b.planned - a.planned);

  return (
    <>
      <PageHeader title="Budgets" description="Planned vs actual, rolled up per project." />
      {projects.length === 0 ? (
        <GlobalEmpty>No budget lines yet. They’re set inside each project.</GlobalEmpty>
      ) : (
        <GlobalTable headers={['Project', 'Planned', 'Actual', 'Variance']}>
          {projects.map((p) => {
            const variance = p.planned - p.actual;
            return (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}?view=budget`} className="font-medium text-ink hover:text-sea hover:underline">{p.title}</Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{money(p.planned)}</td>
                <td className="px-4 py-3 text-slate-600">{money(p.actual)}</td>
                <td className={`px-4 py-3 font-medium ${variance < 0 ? 'text-red-600' : 'text-green-700'}`}>{money(variance)}</td>
              </tr>
            );
          })}
        </GlobalTable>
      )}
    </>
  );
}
