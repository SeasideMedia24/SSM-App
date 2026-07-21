import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { createAdminClient } from '@/lib/supabase/admin';
import { PortalLinkControl } from '@/components/portal/portal-link-control';
import { ReviewLinkControl } from '@/components/portal/review-link-control';
import { ClientSubmission } from '@/components/portal/client-submission';
import { buttonClass } from '@/components/ui/button-styles';
import { DeleteProjectButton } from '@/components/projects/delete-project-button';
import { ViewSwitcher } from '@/components/projects/view-switcher';
import { TasksPanel } from '@/components/projects/tasks-panel';
import { DeliverablesPanel, ContractsPanel } from '@/components/projects/panels';
import { QuoteBudget } from '@/components/projects/quote-budget';
import { ProjectPriorityControl } from '@/components/projects/priority-picker';
import { ArchiveControl } from '@/components/projects/archive-control';
import { projectStatusMeta } from '@/lib/projects/status';
import { projectTypeLabel } from '@/lib/projects/template';
import { quoteBudgetRow, type PricingContext } from '@/lib/projects/budget';
import type { PricingConfig } from '@/lib/pricing/engine';

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

  // Fetch everything this project owns (small per project) in parallel. The
  // budget derives from the project's quotes, so we pull them all plus the
  // current pricing rates to recompute each quote's cost basis.
  const [
    { data: tasks }, { data: deliverables }, { data: contracts },
    { data: quotes }, { data: roles }, { data: services }, { data: configRows },
    { data: teamLogins }, { data: portal },
  ] = await Promise.all([
    supabase.from('tasks').select('id, title, status, priority, due_date, assignee_id, worker_note').eq('project_id', id).order('created_at'),
    supabase.from('deliverables').select('*').eq('project_id', id).order('position'),
    supabase.from('contracts').select('*').eq('project_id', id).order('position'),
    supabase.from('quotes').select('id, title, status, total, calculator_state, created_at').eq('project_id', id).order('created_at', { ascending: false }),
    supabase.from('pricing_roles').select('*').order('sort'),
    supabase.from('pricing_page_services').select('*').order('sort'),
    supabase.from('pricing_config').select('*'),
    // Team members with logins — the assignable people for this project's tasks.
    supabase.from('contractors').select('name, user_id').not('user_id', 'is', null).order('name'),
    // Client portal (table may not exist pre-migration — handled gracefully).
    supabase.from('client_portal').select('portal_token, brand, tech, links, submitted_at, review_link').eq('project_id', id).maybeSingle(),
  ]);

  // If the client has submitted portal details, pull their files and sign
  // download URLs (private bucket → admin client, owner-gated by this page).
  let submission: { assets: { filename: string; url: string | null }[] } | null = null;
  const hasPortalContent = !!(portal && (portal.submitted_at || portal.brand || portal.links));
  if (hasPortalContent) {
    const admin = createAdminClient();
    const { data: assetRows } = await admin
      .from('portal_assets')
      .select('storage_path, filename')
      .eq('project_id', id)
      .order('created_at');
    const assets = await Promise.all(
      (assetRows ?? []).map(async (a) => {
        const { data } = await admin.storage.from('client-assets').createSignedUrl(a.storage_path, 3600);
        return { filename: a.filename, url: data?.signedUrl ?? null };
      }),
    );
    submission = { assets };
  }

  const meta = projectStatusMeta(project.status);
  const cl = client(project.clients as ClientRel);
  const taskList = tasks ?? [];

  const pricing: PricingContext = {
    roles: roles ?? [],
    services: services ?? [],
    config: Object.fromEntries((configRows ?? []).map((c) => [c.key, c.value])) as PricingConfig,
  };
  const budgetRows = (quotes ?? []).map((q) => quoteBudgetRow(q, pricing));

  const counts = {
    tasks: taskList.length,
    deliverables: (deliverables ?? []).length,
    contracts: (contracts ?? []).length,
    budget: budgetRows.length,
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

      {view === 'tasks' && (
        <TasksPanel
          projectId={project.id}
          tasks={taskList}
          assignees={(teamLogins ?? [])
            .filter((t): t is { name: string; user_id: string } => t.user_id != null)
            .map((t) => ({ id: t.user_id, name: t.name }))}
        />
      )}
      {view === 'deliverables' && <DeliverablesPanel projectId={project.id} items={deliverables ?? []} />}
      {view === 'contracts' && <ContractsPanel projectId={project.id} items={contracts ?? []} />}
      {view === 'budget' && <QuoteBudget rows={budgetRows} />}

      {view === 'overview' && (
        <div className="space-y-6">
          {/* Clickable stat boxes → jump straight into each view */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatLink id={project.id} view="tasks" label="Tasks" value={counts.tasks} />
            <StatLink id={project.id} view="deliverables" label="Deliverables" value={counts.deliverables} />
            <StatLink id={project.id} view="contracts" label="Contracts" value={counts.contracts} />
            <StatLink id={project.id} view="budget" label="Quotes" value={counts.budget} />
          </div>
          {project.description && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Description</p>
              <p className="whitespace-pre-wrap text-sm text-slate-800">{project.description}</p>
            </div>
          )}

          {/* Client portal — the private hub the client uses to book their
              kickoff, share brand assets, and see how revisions work. */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-ink">Client portal</p>
            <p className="mb-3 mt-0.5 text-xs text-slate-400">
              Share this private link with {cl?.name ?? 'the client'} after they sign — it’s their hub for the kickoff, brand assets, and revisions.
            </p>
            <PortalLinkControl projectId={project.id} token={(portal?.portal_token as string | null) ?? null} />
            <div className="mt-4 border-t border-slate-100 pt-4">
              <ReviewLinkControl projectId={project.id} url={(portal?.review_link as string | null) ?? null} />
            </div>
          </div>

          {hasPortalContent && submission && (
            <ClientSubmission
              brand={(portal?.brand as Record<string, string>) ?? {}}
              tech={(portal?.tech as Record<string, string>) ?? {}}
              links={Array.isArray(portal?.links) ? (portal.links as string[]) : []}
              assets={submission.assets}
              submittedAt={portal?.submitted_at ?? null}
            />
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
