import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { QuoteBuilder, type QuoteInitial } from '@/components/calculator/quote-builder';
import { DeleteQuoteButton } from '@/components/calculator/delete-quote-button';
import { QuoteStatusSelect } from '@/components/calculator/quote-status-select';
import { money } from '@/lib/projects/format';
import type { QuoteStatus } from '@/types/database.types';

// The Price Calculator: build a line-item quote from rate presets (or custom
// lines) and save it against a client. Saved quotes are listed below; "Open"
// reloads one into the builder via ?quote=<id>.

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>;
}) {
  const { quote: editId } = await searchParams;
  const supabase = await createClient();

  const [{ data: clients }, { data: projects }, { data: presets }, { data: quotes, error }] = await Promise.all([
    supabase.from('clients').select('id, name, company').order('name'),
    supabase.from('projects').select('id, title, client_id').order('title'),
    supabase.from('rate_presets').select('id, label, unit, default_rate').order('label'),
    supabase
      .from('quotes')
      .select('id, title, status, total, created_at, client_id, clients ( name )')
      .order('created_at', { ascending: false }),
  ]);

  // Edit mode: load the requested quote + its items into the builder.
  let initial: QuoteInitial | undefined;
  if (editId) {
    const [{ data: q }, { data: items }] = await Promise.all([
      supabase.from('quotes').select('id, title, client_id, project_id, notes').eq('id', editId).single(),
      supabase.from('quote_line_items').select('label, quantity, unit, rate').eq('quote_id', editId).order('position'),
    ]);
    if (q) initial = { ...q, items: items ?? [] };
  }

  return (
    <>
      <PageHeader
        title="Price Calculator"
        description="Build a line-item quote from rate presets and save it against a client."
        action={
          <Link href="/settings" className="text-sm font-medium text-sea hover:underline">
            Edit rate presets →
          </Link>
        }
      />

      <div className="flex flex-col gap-8">
        {initial && (
          <p className="rounded-xl bg-aqua/15 px-3 py-2 text-sm text-sea">
            Editing “{initial.title}” — saving will update the existing quote.
          </p>
        )}

        {/* key resets the builder's state when switching between new/edit */}
        <QuoteBuilder
          key={initial?.id ?? 'new'}
          clients={clients ?? []}
          projects={projects ?? []}
          presets={presets ?? []}
          initial={initial}
        />

        {/* Saved quotes */}
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Saved quotes</h2>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Couldn’t load saved quotes. Please refresh the page.
            </p>
          )}

          {!error && (!quotes || quotes.length === 0) && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center">
              <p className="text-sm text-slate-500">No quotes yet — build your first one above.</p>
            </div>
          )}

          {quotes && quotes.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Quote</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => {
                    // Supabase's joined single-FK relation arrives as an object.
                    const clientName = (q.clients as unknown as { name: string } | null)?.name ?? '—';
                    return (
                      <tr key={q.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <Link href={`/calculator?quote=${q.id}`} className="font-medium text-slate-900 hover:underline">
                            {q.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{clientName}</td>
                        <td className="px-4 py-3">
                          <QuoteStatusSelect quoteId={q.id} status={q.status as QuoteStatus} />
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{money(q.total)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <Link href={`/calculator?quote=${q.id}`} className="text-xs font-medium text-sea hover:underline">
                              Open
                            </Link>
                            <DeleteQuoteButton quoteId={q.id} quoteTitle={q.title} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
