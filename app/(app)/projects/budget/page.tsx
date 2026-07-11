import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalTable, GlobalEmpty } from '@/components/projects/global-table';
import { money } from '@/lib/projects/format';
import type { PricingConfig } from '@/lib/pricing/engine';
import { quoteBudgetRow, sumBudget, type PricingContext, type QuoteBudgetRow } from '@/lib/projects/budget';

// All-projects budget: each project's budget is the sum of ALL quotes linked to
// it — cost basis, client charge, and margin (charge − cost). Every quote counts;
// a project with several quotes shows their combined total.
export default async function AllBudgetsPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: quotes }, { data: roles }, { data: services }, { data: configRows }] =
    await Promise.all([
      supabase.from('projects').select('id, title').neq('status', 'archived'),
      supabase
        .from('quotes')
        .select('id, title, status, total, calculator_state, created_at, project_id')
        .not('project_id', 'is', null)
        .order('created_at', { ascending: false }),
      supabase.from('pricing_roles').select('*').order('sort'),
      supabase.from('pricing_page_services').select('*').order('sort'),
      supabase.from('pricing_config').select('*'),
    ]);

  const pricing: PricingContext = {
    roles: roles ?? [],
    services: services ?? [],
    config: Object.fromEntries((configRows ?? []).map((c) => [c.key, c.value])) as PricingConfig,
  };

  // Group quote budget rows by project.
  const byProject = new Map<string, QuoteBudgetRow[]>();
  for (const q of quotes ?? []) {
    if (!q.project_id) continue;
    const list = byProject.get(q.project_id) ?? [];
    list.push(quoteBudgetRow(q, pricing));
    byProject.set(q.project_id, list);
  }

  type Row = { id: string; title: string; count: number; cost: number | null; charge: number; margin: number | null };
  const rows: Row[] = [];
  for (const p of projects ?? []) {
    const quoteRows = byProject.get(p.id);
    if (!quoteRows || quoteRows.length === 0) continue; // no quotes → nothing to budget
    const totals = sumBudget(quoteRows);
    rows.push({ id: p.id, title: p.title, count: quoteRows.length, ...totals });
  }
  rows.sort((a, b) => b.charge - a.charge);

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Each project’s budget from its linked quotes — cost basis, client charge, and margin."
      />
      {rows.length === 0 ? (
        <GlobalEmpty>
          No budgets yet. Link a quote to a project in the{' '}
          <Link href="/calculator" className="text-sea underline">Price Calculator</Link>.
        </GlobalEmpty>
      ) : (
        <GlobalTable headers={['Project', 'Quotes', 'Cost', 'Charge', 'Margin']}>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link href={`/projects/${r.id}?view=budget`} className="font-medium text-ink hover:text-sea hover:underline">
                  {r.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-500">{r.count}</td>
              <td className="px-4 py-3 text-slate-600">{r.cost != null ? money(r.cost) : '—'}</td>
              <td className="px-4 py-3 text-slate-600">{money(r.charge)}</td>
              <td className={`px-4 py-3 font-medium ${r.margin == null ? 'text-slate-400' : r.margin < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {r.margin != null ? money(r.margin) : '—'}
              </td>
            </tr>
          ))}
        </GlobalTable>
      )}
    </>
  );
}
