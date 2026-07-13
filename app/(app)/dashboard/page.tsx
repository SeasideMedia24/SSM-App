import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { proj, type ProjRel } from '@/components/projects/global-table';
import { PaepaeActivity, type PaepaeAction } from '@/components/dashboard/paepae-activity';
import { DashboardMetrics, type MetricDef, type MetricItem } from '@/components/dashboard/metrics';
import { CalendarBlock, type CalendarItem, type CalendarSource, type GoogleStatus } from '@/components/dashboard/calendar-block';
import { parseAnchor, parseView, parseHidden, rangeForView, todayInTz } from '@/lib/dashboard/calendar';
import { syncGoogleEvents } from '@/lib/google/calendar';
import { fmtDate, money } from '@/lib/projects/format';
import { quoteStatusMeta, projectStatusMeta } from '@/lib/projects/status';
import type { QuoteStatus, ProjectStatus } from '@/types/database.types';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cal?: string; view?: string; hide?: string }>;
}) {
  const { cal, view: viewParam, hide: hideParam } = await searchParams;
  const supabase = await createClient();
  const now = new Date();

  // The viewer's timezone (set by the TimezoneCookie in the app layout) so
  // Google times render in the viewer's own zone; defaults to the studio's.
  const tz = (await cookies()).get('ssm_tz')?.value || 'America/New_York';
  const today = todayInTz(tz);
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

  // Calendar block state: which view (month/week/day), which sources are hidden,
  // and the date it's centred on — all from the URL so it's linkable.
  const calView = parseView(viewParam);
  const calHidden = parseHidden(hideParam);
  const calAnchor = parseAnchor(cal, today);
  const { first: calFirst, last: calLast } = rangeForView(calView, calAnchor);

  const [
    { data: overdueTasks },
    { data: overdueDeliverables },
    { data: upcoming },
    { data: activeProjects },
    { data: recentQuotes },
    { data: overdueInvoices },
    { data: paepaeActions },
    { data: calTasks },
    { data: calDeliverables },
    { data: calMilestones },
    { data: calProjects },
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
    // Calendar block: everything dated inside the displayed month.
    supabase.from('tasks').select('id, title, status, due_date, project_id').gte('due_date', calFirst).lte('due_date', calLast),
    supabase.from('deliverables').select('id, title, status, due_date, project_id').gte('due_date', calFirst).lte('due_date', calLast),
    supabase.from('milestones').select('id, title, status, date, project_id').gte('date', calFirst).lte('date', calLast),
    supabase.from('projects').select('id, title, due_date').neq('status', 'archived').gte('due_date', calFirst).lte('due_date', calLast),
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

  // Google Calendar events for the range, in the viewer's timezone. Fetched
  // whenever connected (the chips filter which show); failures → a banner.
  const googleSync = await syncGoogleEvents(supabase, calFirst, calLast, tz);
  const google: GoogleStatus =
    googleSync.status === 'ok'
      ? { status: 'ok' }
      : { status: googleSync.status, message: 'message' in googleSync ? googleSync.message : undefined };

  // Group the range's dated items by day. Every item carries a sourceKey so the
  // calendar's filter chips can show/hide it. Tasks may have no project — those
  // link to My Tasks.
  const itemsByDay: Record<string, CalendarItem[]> = {};
  const addCal = (iso: string | null, item: CalendarItem) => {
    if (!iso) return;
    (itemsByDay[iso] ??= []).push(item);
  };

  // Calendar sources are bucketed by NAME, so the app's own "Seaside Media"
  // schedule and a Google calendar also named "Seaside Media" collapse into a
  // single chip. The app schedule lives under the "Seaside Media" bucket.
  const SSM = 'Seaside Media';
  for (const m of calMilestones ?? []) {
    addCal(m.date, { id: m.id, title: m.title, kind: 'milestone', sourceKey: SSM, href: `/projects/${m.project_id}`, done: m.status === 'done' });
  }
  for (const p of calProjects ?? []) {
    addCal(p.due_date, { id: p.id, title: p.title, kind: 'project', sourceKey: SSM, href: `/projects/${p.id}` });
  }
  for (const d of calDeliverables ?? []) {
    addCal(d.due_date, { id: d.id, title: d.title, kind: 'deliverable', sourceKey: SSM, href: `/projects/${d.project_id}?view=deliverables`, done: d.status === 'done' });
  }
  for (const t of calTasks ?? []) {
    addCal(t.due_date, {
      id: t.id,
      title: t.title,
      kind: 'task',
      sourceKey: SSM,
      href: t.project_id ? `/projects/${t.project_id}?view=tasks` : '/my-tasks',
      done: t.status === 'done',
    });
  }

  // Google events bucket by calendar NAME too, and carry their calendar's color
  // so each calendar's events are visually distinct. Deduped by (day + id).
  const googleSources = new Map<string, CalendarSource>();
  if (googleSync.status === 'ok') {
    const seen = new Set<string>();
    for (const ev of googleSync.events) {
      const bucket = ev.calendar || 'Calendar';
      if (!googleSources.has(bucket)) googleSources.set(bucket, { key: bucket, label: bucket, color: ev.color });
      const dedupeKey = `${ev.dayIso}:${ev.id}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      addCal(ev.dayIso, {
        id: ev.id,
        title: ev.title,
        kind: 'gcal',
        sourceKey: bucket,
        color: ev.color ?? undefined,
        href: ev.htmlLink ?? 'https://calendar.google.com',
        external: true,
        startMin: ev.startMin,
        endMin: ev.endMin,
        timeLabel: ev.timeLabel,
      });
    }
  }

  // Chips: "Seaside Media" first (app + any same-named Google calendar merged),
  // then the other Google calendars by name.
  googleSources.delete(SSM); // merged into the app's Seaside Media bucket
  const calSources: CalendarSource[] = [
    { key: SSM, label: SSM, color: '#14b8a6' },
    ...[...googleSources.values()].sort((a, b) => a.label.localeCompare(b.label)),
  ];

  // Within each day: all-day/app items first, then timed events by start time.
  for (const list of Object.values(itemsByDay)) {
    list.sort((a, b) => (a.startMin ?? -1) - (b.startMin ?? -1));
  }

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

      {/* The calendar — month/week/day views, Seaside/Personal/Everything tabs. */}
      <div className="mt-6">
        <CalendarBlock
          view={calView}
          anchor={calAnchor}
          todayIso={today}
          itemsByDay={itemsByDay}
          sources={calSources}
          hidden={calHidden}
          google={google}
        />
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
