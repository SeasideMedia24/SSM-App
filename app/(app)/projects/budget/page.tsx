import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalTable, GlobalEmpty } from '@/components/projects/global-table';
import { money } from '@/lib/projects/format';
import { computeCost, type CalculatorSelections, type PricingConfig } from '@/lib/pricing/engine';

// The project budget derives from the price calculator: a project's cost budget
// is the COST basis of its linked quote (crew/services before markup, plus
// rental and travel), while margin (charge − cost) is reported separately so
// expenses can be tracked against real cost rather than the client price.
export default async function AllBudgetsPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: quotes }, { data: expenses }, { data: roles }, { data: services }, { data: configRows }] =
    await Promise.all([
      supabase.from('projects').select('id, title').neq('status', 'archived'),
      supabase
        .from('quotes')
        .select('id, project_id, total, calculator_state, created_at')
        .not('project_id', 'is', null)
        .order('created_at', { ascending: false }),
      supabase.from('expenses').select('project_id, amount'),
      supabase.from('pricing_roles').select('*').order('sort'),
      supabase.from('pricing_page_services').select('*').order('sort'),
      supabase.from('pricing_config').select('*'),
    ]);

  const config: PricingConfig = Object.fromEntries((configRows ?? []).map((c) => [c.key, c.value]));

  // The most recent quote linked to each project (quotes come newest-first).
  const latestQuote = new Map<string, { total: number; state: CalculatorSelections | null }>();
  for (const q of quotes ?? []) {
    if (!q.project_id || latestQuote.has(q.project_id)) continue;
    latestQuote.set(q.project_id, {
      total: q.total ?? 0,
      state: (q.calculator_state as unknown as CalculatorSelections) ?? null,
    });
  }

  // Actual spend per project, from logged expenses.
  const actualByProject = new Map<string, number>();
  for (const e of expenses ?? []) {
    if (!e.project_id) continue;
    actualByProject.set(e.project_id, (actualByProject.get(e.project_id) ?? 0) + (e.amount ?? 0));
  }

  type Row = { id: string; title: string; budget: number | null; charge: number | null; margin: number | null; actual: number };
  const rows: Row[] = [];
  for (const p of projects ?? []) {
    const q = latestQuote.get(p.id);
    const actual = actualByProject.get(p.id) ?? 0;
    if (!q && actual === 0) continue; // nothing to show for this project

    let budget: number | null = null;
    let charge: number | null = null;
    let margin: number | null = null;
    if (q) {
      charge = q.total;
      if (q.state) {
        budget = computeCost(q.state, roles ?? [], services ?? [], config).total;
        margin = charge - budget;
      }
    }
    rows.push({ id: p.id, title: p.title, budget, charge, margin, actual });
  }
  rows.sort((a, b) => (b.charge ?? 0) - (a.charge ?? 0));

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Cost budget from each project’s linked quote, with margin (charge − cost) and actual spend tracked separately."
      />
      {rows.length === 0 ? (
        <GlobalEmpty>
          No budgets yet. Link a quote to a project in the Price Calculator, or log expenses inside a project.
        </GlobalEmpty>
      ) : (
        <GlobalTable headers={['Project', 'Budget (cost)', 'Charge', 'Margin', 'Actual', 'Variance']}>
          {rows.map((r) => {
            const variance = r.budget != null ? r.budget - r.actual : null;
            return (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/projects/${r.id}?view=budget`} className="font-medium text-ink hover:text-sea hover:underline">
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{r.budget != null ? money(r.budget) : '—'}</td>
                <td className="px-4 py-3 text-slate-600">{r.charge != null ? money(r.charge) : '—'}</td>
                <td className={`px-4 py-3 font-medium ${r.margin == null ? 'text-slate-400' : r.margin < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {r.margin != null ? money(r.margin) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{money(r.actual)}</td>
                <td className={`px-4 py-3 font-medium ${variance == null ? 'text-slate-400' : variance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {variance != null ? money(variance) : '—'}
                </td>
              </tr>
            );
          })}
        </GlobalTable>
      )}
    </>
  );
}
