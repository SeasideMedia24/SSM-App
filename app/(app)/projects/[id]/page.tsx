import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { buttonClass } from '@/components/ui/button-styles';
import { DeleteProjectButton } from '@/components/projects/delete-project-button';
import { ViewSwitcher } from '@/components/projects/view-switcher';
import { TasksPanel } from '@/components/projects/tasks-panel';
import { projectStatusMeta } from '@/lib/projects/status';

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

  const { data: project } = await supabase
    .from('projects')
    .select('*, clients(id, name)')
    .eq('id', id)
    .single();

  if (!project) notFound();

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, priority, due_date')
    .eq('project_id', id)
    .order('created_at', { ascending: true });

  // Counts for the Overview quick stats + tab hints.
  const [deliverables, contracts, expenses, milestones] = await Promise.all([
    supabase.from('deliverables').select('id', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('milestones').select('id', { count: 'exact', head: true }).eq('project_id', id),
  ]);

  const meta = projectStatusMeta(project.status);
  const cl = client(project.clients as ClientRel);
  const taskList = tasks ?? [];

  return (
    <>
      <PageHeader
        title={project.title}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}/edit`} className={buttonClass('secondary', 'sm')}>
              Edit
            </Link>
            <DeleteProjectButton projectId={project.id} title={project.title} />
          </div>
        }
      />

      {/* Status + meta row */}
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${meta.pill}`}>{meta.label}</span>
        {cl && (
          <Link href={`/clients/${cl.id}`} className="text-slate-600 hover:text-sea hover:underline">
            {cl.name}
          </Link>
        )}
        {(fmt(project.start_date) || fmt(project.due_date)) && (
          <span className="text-slate-400">
            {fmt(project.start_date) ?? '—'} → {fmt(project.due_date) ?? '—'}
          </span>
        )}
        {project.tags?.map((t: string) => (
          <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
            {t}
          </span>
        ))}
      </div>

      {errorFlag === 'delete' && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Couldn’t delete this project. Please try again.</p>
      )}

      <ViewSwitcher active={view} />

      {view === 'tasks' ? (
        <TasksPanel projectId={project.id} tasks={taskList} />
      ) : view === 'overview' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Tasks" value={taskList.length} />
            <Stat label="Deliverables" value={deliverables.count ?? 0} />
            <Stat label="Contracts" value={contracts.count ?? 0} />
            <Stat label="Expenses" value={expenses.count ?? 0} />
          </div>
          {project.description && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Description</p>
              <p className="whitespace-pre-wrap text-sm text-slate-800">{project.description}</p>
            </div>
          )}
          <p className="text-sm text-slate-400">
            {milestones.count ?? 0} timeline milestone{(milestones.count ?? 0) === 1 ? '' : 's'} ready — the Timeline,
            Deliverables, Contracts, Expenses, and Budget views arrive next.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">
            The <span className="font-medium capitalize text-sea">{view}</span> view is coming next (Phase 4.3). Its data
            is already set up from your project template.
          </p>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
