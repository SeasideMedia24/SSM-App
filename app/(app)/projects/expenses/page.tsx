import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalTable, GlobalEmpty, proj, type ProjRel } from '@/components/projects/global-table';
import { money, fmtDate } from '@/lib/projects/format';

export default async function AllExpensesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('expenses')
    .select('id, label, category, amount, spent_on, projects(id, title)')
    .order('spent_on', { ascending: false, nullsFirst: false });

  const rows = data ?? [];
  const total = rows.reduce((s, e) => s + (e.amount ?? 0), 0);

  return (
    <>
      <PageHeader title="Expenses" description="Every expense across all projects." />
      {rows.length === 0 ? (
        <GlobalEmpty>No expenses yet. They’re logged inside each project.</GlobalEmpty>
      ) : (
        <div className="space-y-3">
          <GlobalTable headers={['Expense', 'Project', 'Category', 'Date', 'Amount']}>
            {rows.map((e) => {
              const p = proj(e.projects as ProjRel);
              return (
                <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-ink">{e.label}</td>
                  <td className="px-4 py-3">
                    {p && <Link href={`/projects/${p.id}?view=expenses`} className="text-slate-600 hover:text-sea hover:underline">{p.title}</Link>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{e.category ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(e.spent_on) ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{money(e.amount)}</td>
                </tr>
              );
            })}
          </GlobalTable>
          <p className="text-right text-sm text-slate-600">Total across all projects: <span className="font-semibold text-ink">{money(total)}</span></p>
        </div>
      )}
    </>
  );
}
