import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { GlobalEmpty } from '@/components/projects/global-table';
import { QuoteBudget } from '@/components/projects/quote-budget';
import type { PricingConfig } from '@/lib/pricing/engine';
import { quoteBudgetRow, type PricingContext, type QuoteBudgetRow } from '@/lib/projects/budget';

// All-projects budget: one card per project, each showing that project's quotes
// with the same view as the project's own Budget tab — the quote dropdown, the
// cost/charge/margin cards, and the itemised cost breakdown.
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

  // Group quote budget rows by project (quotes come newest-first).
  const byProject = new Map<string, QuoteBudgetRow[]>();
  for (const q of quotes ?? []) {
    if (!q.project_id) continue;
    const list = byProject.get(q.project_id) ?? [];
    list.push(quoteBudgetRow(q, pricing));
    byProject.set(q.project_id, list);
  }

  const cards = (projects ?? [])
    .map((p) => ({ project: p, rows: byProject.get(p.id) ?? [] }))
    .filter((c) => c.rows.length > 0)
    .sort((a, b) => (b.rows[0]?.charge ?? 0) - (a.rows[0]?.charge ?? 0));

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Each project’s budget from its linked quotes — with the itemised cost of delivering it."
      />
      {cards.length === 0 ? (
        <GlobalEmpty>
          No budgets yet. Link a quote to a project in the{' '}
          <Link href="/calculator" className="text-sea underline">Price Calculator</Link>.
        </GlobalEmpty>
      ) : (
        <div className="space-y-5">
          {cards.map(({ project, rows }) => (
            <section key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <Link href={`/projects/${project.id}?view=budget`} className="text-base font-semibold text-ink hover:text-sea hover:underline">
                  {project.title}
                </Link>
              </div>
              <QuoteBudget rows={rows} />
            </section>
          ))}
        </div>
      )}
    </>
  );
}
