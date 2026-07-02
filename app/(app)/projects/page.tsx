import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { buttonClass } from '@/components/ui/button-styles';
import { ProjectsToolbar } from '@/components/projects/toolbar';
import { ProjectBoard } from '@/components/projects/board';
import { projectStatusMeta } from '@/lib/projects/status';
import type { BoardProject } from '@/components/projects/project-card';
import type { ProjectStatus, ParaCategory } from '@/types/database.types';

type ClientRel = { name: string } | { name: string }[] | null;
function clientName(c: ClientRel): string | null {
  if (!c) return null;
  return Array.isArray(c) ? (c[0]?.name ?? null) : c.name;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; para?: string; tags?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === 'list' ? 'list' : 'board';
  const para = sp.para ?? '';
  const tagFilter = (sp.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);

  const supabase = await createClient();
  let query = supabase
    .from('projects')
    .select('id, title, status, tags, due_date, para_category, clients(name)')
    .order('created_at', { ascending: false });
  if (para) query = query.eq('para_category', para as ParaCategory);

  const { data, error } = await query;

  const allProjects: (BoardProject & { para_category: ParaCategory })[] = (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status as ProjectStatus,
    tags: p.tags ?? [],
    due_date: p.due_date,
    para_category: p.para_category as ParaCategory,
    clientName: clientName(p.clients as ClientRel),
  }));

  // Tag filter (stackable): show projects that have any of the selected tags.
  const projects = tagFilter.length
    ? allProjects.filter((p) => p.tags.some((t) => tagFilter.includes(t)))
    : allProjects;

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

      <ProjectsToolbar view={view} para={para} tags={tagFilter} />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn’t load projects. Please refresh the page.
        </p>
      )}

      {!error && projects.length === 0 && allProjects.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">No projects match these tags.</p>
        </div>
      )}

      {!error && allProjects.length === 0 && (
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
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Category</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const meta = projectStatusMeta(p.status);
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
                    <td className="px-4 py-3 text-slate-600">{p.clientName ?? '—'}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{p.para_category}</td>
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
