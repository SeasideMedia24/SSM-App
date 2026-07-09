import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { buttonClass } from '@/components/ui/button-styles';
import { DeleteContractorButton } from '@/components/contractors/delete-contractor-button';
import { assignProject, unassignProject } from '../actions';
import { contractorTypeMeta } from '@/lib/projects/status';
import { money } from '@/lib/projects/format';
import type { ContractorType } from '@/types/database.types';

type ProjRel = { id: string; title: string } | { id: string; title: string }[] | null;
const oneProject = (p: ProjRel) => (Array.isArray(p) ? (p[0] ?? null) : p);

export default async function ContractorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorFlag } = await searchParams;
  const supabase = await createClient();

  const { data: contractor } = await supabase.from('contractors').select('*').eq('id', id).single();
  if (!contractor) notFound();

  const [{ data: assignments }, { data: allProjects }] = await Promise.all([
    supabase
      .from('project_contractors')
      .select('id, role, rate, rate_unit, projects ( id, title )')
      .eq('contractor_id', id)
      .order('created_at'),
    supabase.from('projects').select('id, title').neq('status', 'archived').order('title'),
  ]);

  const rows = assignments ?? [];
  const assignedIds = new Set(rows.map((r) => oneProject(r.projects as ProjRel)?.id).filter(Boolean));
  const availableProjects = (allProjects ?? []).filter((p) => !assignedIds.has(p.id));
  const meta = contractorTypeMeta(contractor.type as ContractorType);
  const rateLabel = contractor.default_rate != null
    ? `${money(contractor.default_rate)}${contractor.rate_unit ? ` / ${contractor.rate_unit}` : ''}`
    : null;

  return (
    <>
      <PageHeader
        title={contractor.name}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/contractors/${contractor.id}/edit`} className={buttonClass('secondary', 'sm')}>Edit</Link>
            <DeleteContractorButton contractorId={contractor.id} />
          </div>
        }
      />

      {errorFlag === 'delete' && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Couldn’t delete this contractor. Please try again.</p>
      )}

      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>{meta.label}</span>
        {contractor.role && <span className="text-slate-600">{contractor.role}</span>}
        {rateLabel && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{rateLabel}</span>}
        {contractor.email && <a href={`mailto:${contractor.email}`} className="text-sea hover:underline">{contractor.email}</a>}
        {contractor.phone && <span className="text-slate-500">{contractor.phone}</span>}
      </div>

      {contractor.notes && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Notes</p>
          <p className="whitespace-pre-wrap text-sm text-slate-800">{contractor.notes}</p>
        </div>
      )}

      {/* Project assignments */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Project assignments</h2>

        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">Not on any projects yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const p = oneProject(r.projects as ProjRel);
              const rate = r.rate != null
                ? `${money(r.rate)}${r.rate_unit ? ` / ${r.rate_unit}` : ''}`
                : rateLabel
                  ? `${rateLabel} (default)`
                  : '—';
              return (
                <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                  {p ? (
                    <Link href={`/projects/${p.id}`} className="font-medium text-ink hover:text-sea hover:underline">{p.title}</Link>
                  ) : (
                    <span className="text-slate-400">(project removed)</span>
                  )}
                  {r.role && <span className="text-xs text-slate-500">{r.role}</span>}
                  <span className="ml-auto text-slate-600">{rate}</span>
                  <form action={unassignProject}>
                    <input type="hidden" name="assignment_id" value={r.id} />
                    <input type="hidden" name="contractor_id" value={contractor.id} />
                    <button type="submit" className="text-xs font-medium text-slate-400 hover:text-red-600">Remove</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        {/* Assign to a project */}
        {availableProjects.length > 0 && (
          <form action={assignProject} className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
            <input type="hidden" name="contractor_id" value={contractor.id} />
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Project
              <select name="project_id" required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal">
                {availableProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Role (optional)
              <input name="role" placeholder="e.g. Editor" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Rate (optional)
              <input name="rate" type="number" min="0" step="0.01" placeholder="default" className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              Unit
              <input name="rate_unit" placeholder="day" className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal" />
            </label>
            <button type="submit" className={buttonClass('primary', 'sm')}>Assign</button>
          </form>
        )}
      </section>
    </>
  );
}
