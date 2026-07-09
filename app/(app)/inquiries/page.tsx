import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { Collapsible } from '@/components/ui/collapsible';
import { projectTypeLabel } from '@/lib/projects/template';
import { setInquiryStatus } from './actions';

// The owner's intake inbox: every onboarding form submission, with summary
// stats (how many, how often) and the newest / most urgent ones up top.

type Submission = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  project_type: string | null;
  project_description: string | null;
  budget_range: string | null;
  desired_timeline: string | null;
  heard_from: string | null;
  status: string;
  client_id: string | null;
  project_id: string | null;
  created_at: string;
};

// How urgent each timeline answer is (lower = more urgent). Must match the
// TIMELINE_OPTIONS labels in lib/validation/onboarding.ts.
const TIMELINE_URGENCY: Record<string, number> = {
  'ASAP': 0,
  'Within a month': 1,
  '1 – 3 months': 2,
  'Flexible': 3,
};
const urgency = (s: Submission) => TIMELINE_URGENCY[s.desired_timeline ?? ''] ?? 4;

const timelinePill = (t: string | null) => {
  if (t === 'ASAP') return 'bg-red-100 text-red-700';
  if (t === 'Within a month') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default async function InquiriesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('onboarding_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  const subs: Submission[] = data ?? [];
  // Archived inquiries drop out of the active lists but stay in the archival
  // view at the bottom.
  const activeSubs = subs.filter((s) => s.status !== 'archived');
  const archivedSubs = subs.filter((s) => s.status === 'archived');

  // ---- Summary stats ----
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const total = subs.length;
  const awaiting = subs.filter((s) => s.status === 'new').length;
  const thisMonth = subs.filter((s) => {
    const d = new Date(s.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const thisWeek = subs.filter((s) => new Date(s.created_at) >= weekAgo).length;

  // Intakes per month for the last 6 months (oldest → newest) for the mini chart.
  const months: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      count: subs.filter((s) => {
        const c = new Date(s.created_at);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      }).length,
    });
  }
  const maxMonth = Math.max(1, ...months.map((m) => m.count));

  // Unreviewed inquiries, most urgent timeline first, then newest.
  const needsAttention = subs
    .filter((s) => s.status === 'new')
    .sort((a, b) => urgency(a) - urgency(b) || b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title="Inquiries"
        description="Every submission from your onboarding form — newest and most urgent first."
      />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn’t load inquiries. Please refresh the page.
        </p>
      )}

      {!error && (
        <div className="flex flex-col gap-6">
          {/* Summary stats + frequency chart */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard label="Total intakes" value={total} />
            <StatCard label="This month" value={thisMonth} />
            <StatCard label="Last 7 days" value={thisWeek} />
            <StatCard label="Awaiting review" value={awaiting} highlight={awaiting > 0} />
            {/* Mini bar chart: intakes per month, last 6 months */}
            <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last 6 months</p>
              <div className="mt-2 flex gap-1.5">
                {/* Y axis: number scale aligned to the 44px bar zone (max, mid, 0). */}
                <div className="flex h-11 flex-col justify-between text-right text-[9px] leading-none text-slate-400">
                  <span>{maxMonth}</span>
                  {maxMonth > 1 && <span>{Math.round(maxMonth / 2)}</span>}
                  <span>0</span>
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex h-11 items-end gap-1.5">
                    {months.map((m) => (
                      <div key={m.label} className="flex flex-1 items-end" title={`${m.label}: ${m.count}`}>
                        {/* Bar height in px (max 44) so it renders without a fixed-height parent. */}
                        <div
                          className={`w-full rounded-t ${m.count > 0 ? 'bg-teal' : 'bg-slate-100'}`}
                          style={{ height: `${Math.max(4, Math.round((m.count / maxMonth) * 44))}px` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    {months.map((m) => (
                      <span key={m.label} className="flex-1 text-center text-[9px] text-slate-400">{m.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Needs attention */}
          {needsAttention.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Needs attention</h2>
              <ul className="flex flex-col gap-2">
                {needsAttention.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <Link href={`/inquiries/${s.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 hover:text-sea hover:underline">
                        {s.name}
                        {s.company && <span className="font-normal text-slate-500"> · {s.company}</span>}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {projectTypeLabel(s.project_type) ?? 'Project type not given'}
                        {s.budget_range && ` · ${s.budget_range}`}
                        {` · ${fmtDate(s.created_at)}`}
                      </p>
                    </Link>
                    {s.desired_timeline && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${timelinePill(s.desired_timeline)}`}>
                        {s.desired_timeline}
                      </span>
                    )}
                    {s.client_id && (
                      <Link href={`/clients/${s.client_id}`} className="text-xs font-medium text-sea hover:underline">
                        View client
                      </Link>
                    )}
                    <form action={setInquiryStatus}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="status" value="reviewed" />
                      <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                        Mark reviewed
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* All inquiries */}
          {activeSubs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
              <p className="text-sm text-slate-500">No active inquiries.</p>
              <p className="mt-1 text-sm text-slate-400">
                Share your onboarding link (see{' '}
                <Link href="/settings" className="text-sea underline">Settings</Link>
                ) or invite a client from their page.
              </p>
            </div>
          ) : (
            <section>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">All inquiries</h2>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Project</th>
                      <th className="px-4 py-3 font-medium">Budget</th>
                      <th className="px-4 py-3 font-medium">Timeline</th>
                      <th className="px-4 py-3 font-medium">Received</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {activeSubs.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link href={`/inquiries/${s.id}`} className="font-medium text-slate-900 hover:text-sea hover:underline">
                            {s.name}
                          </Link>
                          {s.company && <p className="text-xs text-slate-500">{s.company}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{projectTypeLabel(s.project_type) ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{s.budget_range ?? '—'}</td>
                        <td className="px-4 py-3">
                          {s.desired_timeline ? (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${timelinePill(s.desired_timeline)}`}>
                              {s.desired_timeline}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{fmtDate(s.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.status === 'new' ? 'bg-teal/15 text-sea' : 'bg-slate-100 text-slate-500'}`}>
                            {s.status === 'new' ? 'New' : 'Reviewed'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-3">
                            <form action={setInquiryStatus}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="status" value={s.status === 'new' ? 'reviewed' : 'new'} />
                              <button type="submit" className="text-xs font-medium text-slate-400 hover:text-slate-700">
                                {s.status === 'new' ? 'Mark reviewed' : 'Mark new'}
                              </button>
                            </form>
                            <form action={setInquiryStatus}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="status" value="archived" />
                              <button type="submit" className="text-xs font-medium text-slate-400 hover:text-red-600">
                                Archive
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Archived inquiries — the archival database. Kept out of the active
              lists but always here for reference; one click restores one. */}
          {archivedSubs.length > 0 && (
            <Collapsible title="Archived" count={archivedSubs.length} defaultOpen={false}>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Project</th>
                      <th className="px-4 py-3 font-medium">Budget</th>
                      <th className="px-4 py-3 font-medium">Received</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {archivedSubs.map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0 text-slate-500 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link href={`/inquiries/${s.id}`} className="font-medium text-slate-700 hover:text-sea hover:underline">
                            {s.name}
                          </Link>
                          {s.company && <p className="text-xs text-slate-400">{s.company}</p>}
                        </td>
                        <td className="px-4 py-3">{projectTypeLabel(s.project_type) ?? '—'}</td>
                        <td className="px-4 py-3">{s.budget_range ?? '—'}</td>
                        <td className="px-4 py-3">{fmtDate(s.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <form action={setInquiryStatus}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="status" value="new" />
                              <button type="submit" className="text-xs font-medium text-slate-400 hover:text-sea">
                                Restore
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Collapsible>
          )}
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${highlight ? 'border-teal/40 bg-teal/5' : 'border-slate-200 bg-white'}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${highlight ? 'text-sea' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
