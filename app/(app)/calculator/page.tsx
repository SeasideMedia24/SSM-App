import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { ProductionCalculator, type QuoteInitial } from '@/components/calculator/production-calculator';
import { SavedQuotePicker } from '@/components/calculator/saved-quote-picker';
import { DeleteQuoteButton } from '@/components/calculator/delete-quote-button';
import { QuoteStatusSelect } from '@/components/calculator/quote-status-select';
import { ShareQuoteControl } from '@/components/calculator/share-quote-control';
import { createInvoiceFromQuote } from '@/app/(app)/invoices/actions';
import { money } from '@/lib/projects/format';
import type { CalculatorSelections } from '@/lib/pricing/engine';
import type { QuoteStatus } from '@/types/database.types';

// The Production Price Calculator — a web version of the owner's pricing
// spreadsheet. Pick crew/services/amounts, totals compute live, save as a
// quote. Saved quotes list below; "Open" restores the exact selections.

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string; saved?: string }>;
}) {
  const { quote: editId, saved } = await searchParams;
  const supabase = await createClient();

  const [
    { data: clients },
    { data: projects },
    { data: roles },
    { data: services },
    { data: configRows },
    { data: quotes, error },
  ] = await Promise.all([
    supabase.from('clients').select('id, name, company').order('name'),
    supabase.from('projects').select('id, title, client_id').order('title'),
    supabase.from('pricing_roles').select('*').order('sort'),
    supabase.from('pricing_page_services').select('*').order('sort'),
    supabase.from('pricing_config').select('*'),
    supabase
      .from('quotes')
      .select('id, title, status, total, created_at, client_id, share_token, clients ( name )')
      .order('created_at', { ascending: false }),
  ]);

  const config = Object.fromEntries((configRows ?? []).map((c) => [c.key, c.value]));
  const ratesMissing = !roles || roles.length === 0;

  // Edit mode: restore the saved picker selections.
  let initial: QuoteInitial | undefined;
  let legacyQuote = false;
  if (editId) {
    const { data: q } = await supabase
      .from('quotes')
      .select('id, title, client_id, project_id, notes, calculator_state')
      .eq('id', editId)
      .single();
    if (q) {
      const state = (q.calculator_state as CalculatorSelections | null) ?? null;
      legacyQuote = !state;
      initial = { id: q.id, title: q.title, client_id: q.client_id, project_id: q.project_id, notes: q.notes, selections: state };
    }
  }

  return (
    <>
      <PageHeader
        title="Price Calculator"
        description="Pick the crew, services, and amounts — pricing follows your rate sheet."
        action={
          <Link href="/settings" className="text-sm font-medium text-sea hover:underline">
            Edit rates →
          </Link>
        }
      />

      <div className="flex flex-col gap-8">
        {ratesMissing && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Pricing rates aren’t loaded yet — run the migration
            {' '}<code className="rounded bg-amber-100 px-1">20260707000001_pricing_engine.sql</code>{' '}
            in the Supabase SQL Editor (see supabase/README.md), then refresh.
          </p>
        )}

        {saved === '1' && !initial && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Quote saved ✓ — it’s in the list below, and on its project’s budget if you linked one.
          </p>
        )}

        {initial && (
          <p className="rounded-xl bg-aqua/15 px-3 py-2 text-sm text-sea">
            Editing “{initial.title}” — saving will update the existing quote.
            {legacyQuote && ' This quote was built with the old calculator, so its selections start fresh (its saved totals are unchanged until you save).'}
          </p>
        )}

        {/* Quick-load a past quote into the calculator. */}
        {!ratesMissing && quotes && quotes.length > 0 && (
          <SavedQuotePicker
            quotes={quotes.map((q) => ({
              id: q.id,
              title: q.title,
              client: (q.clients as unknown as { name: string } | null)?.name ?? null,
            }))}
            currentId={editId ?? null}
          />
        )}

        {!ratesMissing && (
          <ProductionCalculator
            key={initial?.id ?? (saved === '1' ? 'saved' : 'new')}
            clients={clients ?? []}
            projects={projects ?? []}
            roles={roles ?? []}
            services={services ?? []}
            config={config}
            initial={initial}
            justSaved={saved === '1'}
          />
        )}

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
                            <form action={createInvoiceFromQuote}>
                              <input type="hidden" name="quote_id" value={q.id} />
                              <button type="submit" className="text-xs font-medium text-sea hover:underline">
                                Create invoice
                              </button>
                            </form>
                            <ShareQuoteControl quoteId={q.id} token={q.share_token} />
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
