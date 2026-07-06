import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { buttonClass } from '@/components/ui/button-styles';
import { ProjectsToolbar } from '@/components/projects/toolbar';
import { ProjectBoard } from '@/components/projects/board';
import { projectStatusMeta, taskPriorityMeta } from '@/lib/projects/status';
import { projectTypeLabel } from '@/lib/projects/template';
import { compareProjects } from '@/lib/projects/sort';
import type { BoardProject } from '@/components/projects/project-card';
import type { ProjectStatus, TaskPriority, ClientType } from '@/types/database.types';

type ClientRel = { name: string; client_type: ClientType } | { name: string; client_type: ClientType }[] | null;
function clientOf(c: ClientRel): { name: string; client_type: ClientType } | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; ptype?: string; ctype?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === 'list' ? 'list' : 'board';
  const ptype = sp.ptype ?? '';
  const ctype = sp.ctype ?? '';

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, status, priority, project_type, due_date, clients(name, client_type)')
    .order('created_at', { ascending: false });

  const mapped = (data ?? []).map((p) => {
    const cl = clientOf(p.clients as ClientRel);
    return {
      id: p.id,
      title: p.title,
      status: p.status as ProjectStatus,
      priority: p.priority as TaskPriority,
      project_type: p.project_type,
      due_date: p.due_date,
      clientName: cl?.name ?? null,
      clientType: cl?.client_type ?? null,
    };
  });

  // Filter by project type + client type (both from the URL).
  const filtered = mapped.filter(
    (p) => (!ptype || p.project_type === ptype) && (!ctype || p.clientType === ctype),
  );
  const projects: BoardProject[] = filtered.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    priority: p.priority,
    project_type: p.project_type,
    due_date: p.due_date,
    clientName: p.clientName,
  }));

  return (
    <>
      <PageHeader
        title="Projects"
        description="Your pipeline, from first inquiry to delivery."
        action={
          <Link href="/projects/new" className={buttonClass('primary')}>
            New project
          </Link>
        }
      />

      <ProjectsToolbar view={view} ptype={ptype} ctype={ctype} />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn’t load projects. Please refresh the page.
        </p>
      )}

      {!error && projects.length === 0 && mapped.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">No projects match these filters.</p>
        </div>
      )}

      {!error && mapped.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">No projects yet.</p>
          <Link href="/projects/new" className="mt-2 inline-block text-sm font-medium text-sea underline">
            Create your first project
          </Link>
        </div>
      )}

      {!error && projects.length > 0 && view === 'board' && <ProjectBoard initial={projects} />}

      {!error && projects.length > 0 && view === 'list' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Project</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              {[...projects].sort(compareProjects).map((p) => {
                const meta = projectStatusMeta(p.status);
                const prio = taskPriorityMeta(p.priority);
                return (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${p.id}`} className="font-medium text-ink hover:underline">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${meta.pill}`}>{meta.label}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{projectTypeLabel(p.project_type) ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.clientName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${prio.pill}`}>{prio.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
