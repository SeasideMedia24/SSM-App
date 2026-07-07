// Public, client-facing quote document at a private unguessable link.
// The owner generates /quote/<token> from the calculator's saved-quotes list,
// sends it to the client (or prints it to PDF). The lookup uses the admin
// client because the visitor is anonymous — RLS stays locked for anon, and
// only the single quote matching the token is ever exposed.

import { createAdminClient } from '@/lib/supabase/admin';
import { PrintButton } from '@/components/quote/print-button';
import { money } from '@/lib/projects/format';

export const metadata = { title: 'Your quote — Seaside Media' };

export default async function SharedQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: quote } = await admin
    .from('quotes')
    .select('id, title, subtotal, total, notes, created_at, clients ( name, company )')
    .eq('share_token', token)
    .single();

  if (!quote) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <p className="font-display text-2xl tracking-wide text-ink">SEASIDE MEDIA</p>
          <h1 className="mt-4 text-lg font-semibold text-ink">This quote link isn’t active</h1>
          <p className="mt-2 text-sm text-slate-500">
            It may have been replaced or removed. Please reach out to Seaside Media for a fresh link.
          </p>
        </div>
      </main>
    );
  }

  const { data: items } = await admin
    .from('quote_line_items')
    .select('id, label, amount')
    .eq('quote_id', quote.id)
    .order('position');

  const client = quote.clients as unknown as { name: string; company: string | null } | null;
  const discounted = quote.total < quote.subtotal;
  const discountPct = discounted ? Math.round((1 - quote.total / quote.subtotal) * 100) : 0;
  const date = new Date(quote.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        {/* Screen-only toolbar */}
        <div className="mb-4 flex items-center justify-end print:hidden">
          <PrintButton />
        </div>

        {/* The document */}
        <div className="rounded-2xl bg-white p-10 shadow-sm ring-1 ring-slate-200 print:rounded-none print:p-0 print:shadow-none print:ring-0">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="font-display text-3xl tracking-wide text-ink">SEASIDE MEDIA</p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.25em] text-sea">Video Production</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Quote</p>
              <p className="mt-0.5 text-sm text-slate-600">{date}</p>
            </div>
          </header>

          <section className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Prepared for</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{client?.name ?? '—'}</p>
              {client?.company && <p className="text-sm text-slate-500">{client.company}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Project</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{quote.title}</p>
            </div>
          </section>

          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((it) => (
                <tr key={it.id} className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-700">{it.label}</td>
                  <td className="py-2.5 text-right text-slate-700">{money(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 ml-auto flex w-full max-w-xs flex-col gap-1.5">
            {discounted && (
              <>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Subtotal</span><span>{money(quote.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-emerald-700">
                  <span>Discount</span><span>−{discountPct}%</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between border-t border-slate-300 pt-2 text-base font-semibold text-ink">
              <span>Total</span><span>{money(quote.total)}</span>
            </div>
          </div>

          {quote.notes && (
            <section className="mt-8 rounded-xl bg-slate-50 p-4 print:bg-white print:p-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{quote.notes}</p>
            </section>
          )}

          <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
            Questions? Reply to the email this came with, or reach us at jeremy@seasidemedia.co
          </footer>
        </div>
      </div>
    </main>
  );
}
