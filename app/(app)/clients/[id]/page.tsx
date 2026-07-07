import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { DeleteClientButton } from '@/components/delete-client-button';
import { buttonClass } from '@/components/ui/button-styles';
import { clientTypeMeta, quoteStatusMeta } from '@/lib/projects/status';
import { money } from '@/lib/projects/format';
import { InviteControl } from '@/components/clients/invite-control';
import type { QuoteStatus } from '@/types/database.types';

// In Next.js 16, `params` and `searchParams` are Promises and must be awaited.
export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorFlag } = await searchParams;
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  if (!client) {
    notFound();
  }

  // A client's projects and quotes (both empty until those features land).
  const [{ data: projects }, { data: quotes }] = await Promise.all([
    supabase.from('projects').select('id, title, status').eq('client_id', id).order('created_at', { ascending: false }),
    supabase.from('quotes').select('id, title, status, total').eq('client_id', id).order('created_at', { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title={client.name}
        description={client.company ?? undefined}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/clients/${client.id}/edit`} className={buttonClass('secondary', 'sm')}>
              Edit
            </Link>
            <DeleteClientButton clientId={client.id} clientName={client.name} />
          </div>
        }
      />

      <div className="-mt-3 mb-6 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${clientTypeMeta(client.client_type).pill}`}>
          {clientTypeMeta(client.client_type).label}
        </span>
        {client.onboarded_at && (
          <span className="rounded-full bg-teal/15 px-2 py-0.5 text-[11px] font-medium text-sea">Onboarded</span>
        )}
      </div>

      {errorFlag === 'delete' && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn’t delete this client. Please try again.
        </p>
      )}

      {/* Contact details */}
      <div className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
        <Detail label="Email" value={client.email} />
        <Detail label="Phone" value={client.phone} />
        <Detail label="Notes" value={client.notes} full />
      </div>

      {/* Onboarding invite */}
      <Section title="Onboarding">
        <div className="flex flex-col gap-2 py-1">
          <p className="text-sm text-slate-500">
            Send a private link so this client can fill in their own details (updates this record).
          </p>
          <InviteControl clientId={client.id} clientName={client.name} email={client.email} token={client.onboard_token} />
        </div>
      </Section>

      {/* Projects */}
      <Section title="Projects">
        {projects && projects.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-900">{p.title}</span>
                <span className="text-slate-500">{p.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No projects for this client yet.</Empty>
        )}
      </Section>

      {/* Quotes */}
      <Section title="Quotes">
        {quotes && quotes.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {quotes.map((q) => {
              const meta = quoteStatusMeta(q.status as QuoteStatus);
              return (
                <li key={q.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/calculator?quote=${q.id}`} className="text-slate-900 hover:underline">
                    {q.title}
                  </Link>
                  <span className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.pill}`}>{meta.label}</span>
                    <span className="font-medium text-slate-700">{money(q.total)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>No quotes for this client yet.</Empty>
        )}
      </Section>
    </>
  );
}

function Detail({ label, value, full }: { label: string; value: string | null; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">{value ?? '—'}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-slate-500">{children}</p>;
}
