import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { proj, type ProjRel } from '@/components/projects/global-table';
import { PaepaeActivity, type PaepaeAction } from '@/components/dashboard/paepae-activity';
import { DashboardMetrics, type MetricDef, type MetricItem } from '@/components/dashboard/metrics';
import { fmtDate, money } from '@/lib/projects/format';
import { quoteStatusMeta, projectStatusMeta } from '@/lib/projects/status';
import type { QuoteStatus, ProjectStatus } from '@/types/database.types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: overdueTasks },
    { data: overdueDeliverables },
    { data: upcoming },
    { data: activeProjects },
    { data: recentQuotes },
    { data: overdueInvoices },
    { data: paepaeActions },
  ] = await Promise.all([
    supabase.from('tasks').select('id, title, due_date, projects(id, title)').lt('due_date', today).neq('status', 'done').order('due_date'),
    supabase.from('deliverables').select('id, title, due_date, projects(id, title)').lt('due_date', today).neq('status', 'done').order('due_date'),
    supabase.from('milestones').select('id, title, date, projects(id, title)').gte('date', today).order('date').limit(8),
    supabase.from('projects').select('id, title, status, due_date').neq('status', 'archived').order('due_date', { nullsFirst: false }),
    supabase.from('quotes').select('id, title, status, total, clients ( name )').order('created_at', { ascending: false }).limit(5),
    // Overdue invoices = sent and past due. Tolerant of the table not existing
    // yet (pre-migration) — the error is ignored and treated as empty.
    supabase.from('invoices').select('id, invoice_number, title, total, due_date, clients ( name )').eq('status', 'sent').lt('due_date', today).order('due_date'),
    // PaePae's recent confirmed actions. Tolerant of the table not existing yet
    // (before the migration is applied) — the query just returns an error we ignore.
    supabase.from('paepae_actions').select('id, action, summary, result, created_at').gte('created_at', fiveDaysAgo).order('created_at', { ascending: false }).limit(20),
  ]);

  const oTasks = overdueTasks ?? [];
  const oDeliv = overdueDeliverables ?? [];
  const up = upcoming ?? [];
  const projectsList = activeProjects ?? [];
  const paepaeLog = (paepaeActions ?? []) as PaepaeAction[];

  // Build the clickable KPI row. Each metric carries the items behind its number
  // so clicking it can expand an inline list.
  const taskItems: MetricItem[] = oTasks.map((t) => ({
    id: t.id, label: t.title, kind: 'Task', project: proj(t.projects as ProjRel), projectView: 'tasks', date: fmtDate(t.due_date),
  }));
  const delivItems: MetricItem[] = oDeliv.map((d) => ({
    id: d.id, label: d.title, kind: 'Deliverable', project: proj(d.projects as ProjRel), projectView: 'deliverables', date: fmtDate(d.due_date),
  }));
  const milestoneItems: MetricItem[] = up.map((m) => ({
    id: m.id, label: m.title, kind: 'Milestone', project: proj(m.projects as ProjRel), date: fmtDate(m.date),
  }));
  const projectItems: MetricItem[] = projectsList.map((p) => ({
    id: p.id, label: p.title, href: `/projects/${p.id}`, kind: projectStatusMeta(p.status as ProjectStatus).label, date: fmtDate(p.due_date),
  }));
  const invoiceList = overdueInvoices ?? [];
  const invoiceItems: MetricItem[] = invoiceList.map((inv) => ({
    id: inv.id,
    label: `${inv.invoice_number ? `${inv.invoice_number} · ` : ''}${inv.title}`,
    href: `/invoices/${inv.id}`,
    kind: (inv.clients as unknown as { name: string } | null)?.name,
    date: fmtDate(inv.due_date),
  }));

  const metrics: MetricDef[] = [
    { key: 'projects', label: 'Active projects', value: projectsList.length, items: projectItems, emptyText: 'No active projects.' },
    { key: 'tasks', label: 'Overdue tasks', value: oTasks.length, tone: 'warn', items: taskItems, emptyText: 'Nothing overdue. Nice.' },
    { key: 'deliverables', label: 'Overdue deliverables', value: oDeliv.length, tone: 'warn', items: delivItems, emptyText: 'No overdue deliverables.' },
    { key: 'invoices', label: 'Overdue invoices', value: invoiceList.length, tone: 'warn', items: invoiceItems, emptyText: 'No overdue invoices.' },
    { key: 'milestones', label: 'Upcoming milestones', value: up.length, items: milestoneItems, emptyText: 'No upcoming milestones.' },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="What needs attention, and what’s coming up." />

      <DashboardMetrics metrics={metrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="PaePae · last 5 days">
          <PaepaeActivity actions={paepaeLog} />
        </Panel>

        <Panel title="Recent quotes">
          {!recentQuotes || recentQuotes.length === 0 ? (
            <Empty>
              No quotes yet — build one in the{' '}
              <Link href="/calculator" className="text-sea underline">Price Calculator</Link>.
            </Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentQuotes.map((q) => {
                const meta = quoteStatusMeta(q.status as QuoteStatus);
                const clientName = (q.clients as unknown as { name: string } | null)?.name;
                return (
                  <li key={q.id} className="flex items-center gap-3 py-2 text-sm">
                    <Link href={`/calculator?quote=${q.id}`} className="text-ink hover:underline">{q.title}</Link>
                    {clientName && <span className="text-xs text-slate-500">{clientName}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>{meta.label}</span>
                    <span className="ml-auto font-medium text-slate-700">{money(q.total)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Panel({ title, accent, children }: { title: string; accent?: 'warn'; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className={`mb-3 text-sm font-semibold ${accent === 'warn' ? 'text-red-600' : 'text-slate-900'}`}>{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-slate-400">{children}</p>;
}
