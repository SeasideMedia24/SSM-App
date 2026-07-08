import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { proj, type ProjRel } from '@/components/projects/global-table';
import { PaepaeActivity, type PaepaeAction } from '@/components/dashboard/paepae-activity';
import { fmtDate, money } from '@/lib/projects/format';
import { quoteStatusMeta } from '@/lib/projects/status';
import type { QuoteStatus } from '@/types/database.types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: overdueTasks },
    { data: overdueDeliverables },
    { data: upcoming },
    { count: activeProjects },
    { data: recentQuotes },
    { data: paepaeActions },
  ] = await Promise.all([
    supabase.from('tasks').select('id, title, due_date, projects(id, title)').lt('due_date', today).neq('status', 'done').order('due_date'),
    supabase.from('deliverables').select('id, title, due_date, projects(id, title)').lt('due_date', today).neq('status', 'done').order('due_date'),
    supabase.from('milestones').select('id, title, date, projects(id, title)').gte('date', today).order('date').limit(8),
    supabase.from('projects').select('id', { count: 'exact', head: true }).neq('status', 'archived'),
    supabase.from('quotes').select('id, title, status, total, clients ( name )').order('created_at', { ascending: false }).limit(5),
    // PaePae's recent confirmed actions. Tolerant of the table not existing yet
    // (before the migration is applied) — the query just returns an error we ignore.
    supabase.from('paepae_actions').select('id, action, summary, result, created_at').gte('created_at', fiveDaysAgo).order('created_at', { ascending: false }).limit(20),
  ]);

  const oTasks = overdueTasks ?? [];
  const oDeliv = overdueDeliverables ?? [];
  const up = upcoming ?? [];
  const paepaeLog = (paepaeActions ?? []) as PaepaeAction[];

  return (
    <>
      <PageHeader title="Dashboard" description="What needs attention, and what’s coming up." />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Active projects" value={activeProjects ?? 0} />
        <Metric label="Overdue tasks" value={oTasks.length} tone={oTasks.length ? 'warn' : undefined} />
        <Metric label="Overdue deliverables" value={oDeliv.length} tone={oDeliv.length ? 'warn' : undefined} />
        <Metric label="Upcoming milestones" value={up.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Overdue" accent="warn">
          {oTasks.length === 0 && oDeliv.length === 0 ? (
            <Empty>Nothing overdue. Nice.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {oTasks.map((t) => <FlagRow key={t.id} label={t.title} kind="Task" date={t.due_date} rel={t.projects as ProjRel} view="tasks" />)}
              {oDeliv.map((d) => <FlagRow key={d.id} label={d.title} kind="Deliverable" date={d.due_date} rel={d.projects as ProjRel} view="deliverables" />)}
            </ul>
          )}
        </Panel>

        <Panel title="Upcoming milestones">
          {up.length === 0 ? (
            <Empty>No upcoming milestones.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {up.map((m) => <FlagRow key={m.id} label={m.title} kind="Milestone" date={m.date} rel={m.projects as ProjRel} view="timeline" />)}
            </ul>
          )}
        </Panel>

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

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'warn' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-3xl font-semibold ${tone === 'warn' && value > 0 ? 'text-red-600' : 'text-ink'}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
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

function FlagRow({ label, kind, date, rel, view }: { label: string; kind: string; date: string | null; rel: ProjRel; view: string }) {
  const p = proj(rel);
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{kind}</span>
      <span className="text-ink">{label}</span>
      {p && (
        <Link href={`/projects/${p.id}?view=${view}`} className="text-xs text-slate-500 hover:text-sea hover:underline">
          {p.title}
        </Link>
      )}
      {fmtDate(date) && <span className="ml-auto text-[11px] text-slate-400">{fmtDate(date)}</span>}
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-slate-400">{children}</p>;
}
