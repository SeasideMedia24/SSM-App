// Public, client-facing invoice document at a private unguessable link — the
// invoice twin of /quote/<token>. The owner generates /invoice/<token> from an
// invoice's page, sends it to the client, or opens it to print / save as PDF.
// The lookup uses the admin client because the visitor is anonymous — RLS stays
// locked for anon, and only the single invoice matching the token is exposed.

import { createAdminClient } from '@/lib/supabase/admin';
import { BrandLogo } from '@/components/brand-logo';
import { PrintButton } from '@/components/quote/print-button';
import { money, fmtDate } from '@/lib/projects/format';

export const metadata = { title: 'Your invoice — Seaside Media' };

export default async function SharedInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invoice } = await admin
    .from('invoices')
    .select('id, invoice_number, title, status, subtotal, total, notes, issue_date, due_date, created_at, qbo_payment_link, clients ( name, company )')
    .eq('share_token', token)
    .single();

  if (!invoice) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <BrandLogo size="sm" tagline={false} className="justify-center" />
          <h1 className="mt-4 text-lg font-semibold text-ink">This invoice link isn’t active</h1>
          <p className="mt-2 text-sm text-slate-500">
            It may have been replaced or removed. Please reach out to Seaside Media for a fresh link.
          </p>
        </div>
      </main>
    );
  }

  const { data: items } = await admin
    .from('invoice_line_items')
    .select('id, label, quantity, unit, rate, amount')
    .eq('invoice_id', invoice.id)
    .order('position');

  const client = invoice.clients as unknown as { name: string; company: string | null } | null;
  const issued = fmtDate(invoice.issue_date) ?? new Date(invoice.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const due = fmtDate(invoice.due_date);
  const paid = invoice.status === 'paid';

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        {/* Screen-only toolbar — Pay Now front and center when QB Payments is live */}
        <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
          {!paid && invoice.qbo_payment_link ? (
            <a
              href={invoice.qbo_payment_link}
              target="_blank"
              rel="noreferrer"
              className="brand-gradient rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-deep/20 transition hover:brightness-110"
            >
              Pay {money(invoice.total)} now →
            </a>
          ) : <span />}
          <PrintButton />
        </div>

        {/* The document */}
        <div className="rounded-2xl bg-white p-10 shadow-sm ring-1 ring-slate-200 print:rounded-none print:p-0 print:shadow-none print:ring-0">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
            <BrandLogo size="lg" />
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Invoice</p>
              {invoice.invoice_number && <p className="mt-0.5 text-sm font-medium text-ink">{invoice.invoice_number}</p>}
              <p className="mt-0.5 text-sm text-slate-600">Issued {issued}</p>
              {due && (
                <p className={`text-sm ${paid ? 'text-slate-600' : 'font-medium text-slate-800'}`}>Due {due}</p>
              )}
              {paid && (
                <p className="mt-1 inline-block rounded-md border border-emerald-300 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Paid — thank you
                </p>
              )}
            </div>
          </header>

          <section className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Billed to</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{client?.name ?? '—'}</p>
              {client?.company && <p className="text-sm text-slate-500">{client.company}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">For</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{invoice.title}</p>
            </div>
          </section>

          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Rate</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((it) => (
                <tr key={it.id} className="border-b border-slate-100">
                  <td className="py-2.5 text-slate-700">{it.label}</td>
                  <td className="py-2.5 text-right text-slate-600">{it.quantity}{it.unit ? ` ${it.unit}` : ''}</td>
                  <td className="py-2.5 text-right text-slate-600">{money(it.rate)}</td>
                  <td className="py-2.5 text-right text-slate-700">{money(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 ml-auto flex w-full max-w-xs flex-col gap-1.5">
            <div className="flex items-center justify-between border-t border-slate-300 pt-2 text-base font-semibold text-ink">
              <span>{paid ? 'Total (paid)' : 'Total due'}</span><span>{money(invoice.total)}</span>
            </div>
          </div>

          {invoice.notes && (
            <section className="mt-8 rounded-xl bg-slate-50 p-4 print:bg-white print:p-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{invoice.notes}</p>
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
