import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { buttonClass } from '@/components/ui/button-styles';
import { DeleteProjectButton } from '@/components/projects/delete-project-button';
import { ViewSwitcher } from '@/components/projects/view-switcher';
import { TasksPanel } from '@/components/projects/tasks-panel';
import {
  DeliverablesPanel, ContractsPanel, ExpensesPanel, BudgetPanel, TimelinePanel,
} from '@/components/projects/panels';
import { ProjectPriorityControl } from '@/components/projects/priority-picker';
import { ArchiveControl } from '@/components/projects/archive-control';
import { projectStatusMeta } from '@/lib/projects/status';
import { projectTypeLabel } from '@/lib/projects/template';

type ClientRel = { id: string; name: string } | { id: string; name: string }[] | null;
function client(c: ClientRel): { id: string; name: string } | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}
function fmt(date: string | null) {
  return date ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; error?: string }>;
}) {
  const { id } = await params;
  const { view = 'overview', error: errorFlag } = await searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase.from('projects').select('*, clients(id, name)').eq('id', id).single();
  if (!project) notFound();

  // Fetch everything this project owns (small per project) in parallel.
  const [
    { data: tasks }, { data: deliverables }, { data: contracts },
    { data: expenses }, { data: budgetLines }, { data: milestones }, { data: acceptedQuotes },
  ] = await Promise.all([
    supabase.from('tasks').select('id, title, status, priority, due_date').eq('project_id', id).order('created_at'),
    supabase.from('deliverables').select('*').eq('project_id', id).order('position'),
    supabase.from('contracts').select('*').eq('project_id', id).order('position'),
    supabase.from('expenses').select('*').eq('project_id', id).order('spent_on', { ascending: true, nullsFirst: false }),
    supabase.from('budget_lines').select('*').eq('project_id', id).order('position'),
    supabase.from('milestones').select('*').eq('project_id', id).order('date', { ascending: true, nullsFirst: false }),
    supabase.from('quotes').select('total').eq('project_id', id).eq('status', 'accepted'),
  ]);

  const meta = projectStatusMeta(project.status);
  const cl = client(project.clients as ClientRel);
  const taskList = tasks ?? [];
  const expensesTotal = (expenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
  const quoteTotal = (acceptedQuotes ?? []).length
    ? (acceptedQuotes ?? []).reduce((s, q) => s + (q.total ?? 0), 0)
    : null;

  const counts = {
    tasks: taskList.length,
    deliverables: (deliverables ?? []).length,
    contracts: (contracts ?? []).length,
    expenses: (expenses ?? []).length,
    budget: (budgetLines ?? []).length,
    timeline: (milestones ?? []).length,
  };

  return (
    <>
      <PageHeader
        title={project.title}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}/edit`} className={buttonClass('secondary', 'sm')}>Edit</Link>
            <DeleteProjectButton projectId={project.id} title={project.title} />
          </div>
        }
      />

      <div className="-mt-3 mb-5 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${meta.pill}`}>{meta.label}</span>
        {cl && <Link href={`/clients/${cl.id}`} className="text-slate-600 hover:text-sea hover:underline">{cl.name}</Link>}
        {projectTypeLabel(project.project_type) && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{projectTypeLabel(project.project_type)}</span>
        )}
        {(fmt(project.start_date) || fmt(project.due_date)) && (
          <span className="text-slate-400">{fmt(project.start_date) ?? '—'} → {fmt(project.due_date) ?? '—'}</span>
        )}
      </div>

      {errorFlag === 'delete' && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Couldn’t delete this project. Please try again.</p>
      )}

      {/* Priority + archive controls */}
      <div className="mb-6 flex flex-wrap items-center gap-5">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-slate-400">Priority</span>
          <ProjectPriorityControl projectId={project.id} value={project.priority} />
        </div>
        <ArchiveControl projectId={project.id} archived={project.status === 'archived'} />
      </div>

      <ViewSwitcher active={view} />

      {view === 'tasks' && <TasksPanel projectId={project.id} tasks={taskList} />}
      {view === 'deliverables' && <DeliverablesPanel projectId={project.id} items={deliverables ?? []} />}
      {view === 'timeline' && <TimelinePanel projectId={project.id} items={milestones ?? []} />}
      {view === 'contracts' && <ContractsPanel projectId={project.id} items={contracts ?? []} />}
      {view === 'expenses' && <ExpensesPanel projectId={project.id} items={expenses ?? []} />}
      {view === 'budget' && (
        <BudgetPanel projectId={project.id} items={budgetLines ?? []} quoteTotal={quoteTotal} expensesTotal={expensesTotal} />
      )}

      {view === 'overview' && (
        <div className="space-y-6">
          {/* Clickable stat boxes → jump straight into each view */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatLink id={project.id} view="tasks" label="Tasks" value={counts.tasks} />
            <StatLink id={project.id} view="deliverables" label="Deliverables" value={counts.deliverables} />
            <StatLink id={project.id} view="timeline" label="Timeline" value={counts.timeline} />
            <StatLink id={project.id} view="contracts" label="Contracts" value={counts.contracts} />
            <StatLink id={project.id} view="expenses" label="Expenses" value={counts.expenses} />
            <StatLink id={project.id} view="budget" label="Budget" value={counts.budget} />
          </div>
          {project.description && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Description</p>
              <p className="whitespace-pre-wrap text-sm text-slate-800">{project.description}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function StatLink({ id, view, label, value }: { id: string; view: string; label: string; value: number }) {
  return (
    <Link
      href={`/projects/${id}?view=${view}`}
      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal hover:shadow-md"
    >
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-slate-500 group-hover:text-sea">{label}</p>
    </Link>
  );
}
