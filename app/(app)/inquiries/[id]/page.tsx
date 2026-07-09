import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { projectTypeLabel } from '@/lib/projects/template';
import { setInquiryStatus } from '../actions';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

const STATUS_LABEL: Record<string, string> = { new: 'New', reviewed: 'Reviewed', archived: 'Archived' };

export default async function InquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase.from('onboarding_submissions').select('*').eq('id', id).maybeSingle();
  if (!s) notFound();

  const status: string = s.status;

  return (
    <>
      <div className="mb-4">
        <Link href="/inquiries" className="text-sm text-slate-500 hover:text-sea hover:underline">
          ← Back to inquiries
        </Link>
      </div>

      <PageHeader
        title={s.name}
        description={`${s.company ? `${s.company} · ` : ''}Received ${fmtDate(s.created_at)}`}
      />

      <div className="flex flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Inquiry</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                status === 'new' ? 'bg-teal/15 text-sea' : status === 'archived' ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {STATUS_LABEL[status] ?? status}
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <Field label="Email" value={s.email} href={s.email ? `mailto:${s.email}` : undefined} />
            <Field label="Phone" value={s.phone} href={s.phone ? `tel:${s.phone}` : undefined} />
            <Field label="Project type" value={projectTypeLabel(s.project_type) ?? s.project_type} />
            <Field label="Budget" value={s.budget_range} />
            <Field label="Timeline" value={s.desired_timeline} />
            <Field label="Heard from" value={s.heard_from} />
          </dl>

          {s.project_description && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Project description</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{s.project_description}</p>
            </div>
          )}
        </section>

        {/* Linked records + actions */}
        <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {s.client_id && (
            <Link href={`/clients/${s.client_id}`} className="text-sm font-medium text-sea hover:underline">
              View client
            </Link>
          )}
          {s.project_id && (
            <Link href={`/projects/${s.project_id}`} className="text-sm font-medium text-sea hover:underline">
              View project
            </Link>
          )}

          <div className="ml-auto flex items-center gap-2">
            {status !== 'archived' && (
              <form action={setInquiryStatus}>
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="status" value={status === 'new' ? 'reviewed' : 'new'} />
                <button type="submit" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                  {status === 'new' ? 'Mark reviewed' : 'Mark new'}
                </button>
              </form>
            )}
            <form action={setInquiryStatus}>
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="status" value={status === 'archived' ? 'new' : 'archived'} />
              <button
                type="submit"
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  status === 'archived' ? 'bg-slate-900 text-white hover:bg-slate-700' : 'border border-slate-200 text-slate-500 hover:text-red-600'
                }`}
              >
                {status === 'archived' ? 'Restore' : 'Archive'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}

function Field({ label, value, href }: { label: string; value: string | null; href?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700">
        {value ? (
          href ? (
            <a href={href} className="text-sea hover:underline">
              {value}
            </a>
          ) : (
            value
          )
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </dd>
    </div>
  );
}
