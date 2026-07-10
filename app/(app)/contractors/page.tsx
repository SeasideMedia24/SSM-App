import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { buttonClass } from '@/components/ui/button-styles';
import { contractorTypeMeta } from '@/lib/projects/status';
import { contractorRatesSummary } from '@/lib/projects/format';
import type { ContractorType } from '@/types/database.types';

export default async function ContractorsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contractors')
    .select('id, name, type, role, rate_full, rate_half, rate_hourly, project_contractors(count)')
    .order('name');

  const contractors = data ?? [];
  const assignmentCount = (c: (typeof contractors)[number]) =>
    (c.project_contractors as unknown as { count: number }[] | null)?.[0]?.count ?? 0;

  return (
    <>
      <PageHeader
        title="Contractors & Team"
        description="Everyone who works on your productions — internal, external, and employees."
        action={<Link href="/contractors/new" className={buttonClass('primary', 'sm')}>New contractor</Link>}
      />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Couldn’t load the team. Please refresh the page.</p>
      )}

      {!error && contractors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">No one on the team yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Add your first with{' '}
            <Link href="/contractors/new" className="text-sea underline">New contractor</Link>.
          </p>
        </div>
      ) : (
        !error && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Rates</th>
                  <th className="px-4 py-3 font-medium">Projects</th>
                </tr>
              </thead>
              <tbody>
                {contractors.map((c) => {
                  const meta = contractorTypeMeta(c.type as ContractorType);
                  return (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/contractors/${c.id}`} className="font-medium text-slate-900 hover:underline">{c.name}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.role ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{contractorRatesSummary(c)}</td>
                      <td className="px-4 py-3 text-slate-500">{assignmentCount(c)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  );
}
