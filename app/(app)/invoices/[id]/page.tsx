import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { InvoiceStatusSelect } from '@/components/invoices/invoice-status-select';
import { DeleteInvoiceButton } from '@/components/invoices/delete-invoice-button';
import { ShareInvoiceControl } from '@/components/invoices/share-invoice-control';
import { QuickbooksPanel } from '@/components/invoices/quickbooks-panel';
import { updateInvoiceDueDate } from '../actions';
import { money, fmtDate } from '@/lib/projects/format';
import type { InvoiceStatus } from '@/types/database.types';

type Rel = { id: string; name?: string; title?: string } | { id: string; name?: string; title?: string }[] | null;
const one = (r: Rel) => (Array.isArray(r) ? (r[0] ?? null) : r);

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: invoice }, { data: qboAccount }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients ( id, name, email ), projects ( id, title )')
      .eq('id', id)
      .single(),
    supabase.from('qbo_accounts').select('user_id').maybeSingle(),
  ]);
  if (!invoice) notFound();

  const { data: lineItems } = await supabase
    .from('invoice_line_items')
    .select('id, label, quantity, unit, rate, amount, position')
    .eq('invoice_id', id)
    .order('position');

  const client = one(invoice.clients as Rel) as { id: string; name?: string; email?: string | null } | null;
  const project = one(invoice.projects as Rel);
  const items = lineItems ?? [];
  const overdue = invoice.status === 'sent' && invoice.due_date && invoice.due_date < today;

  return (
    <>
      <PageHeader
        title={invoice.invoice_number ? `${invoice.invoice_number} · ${invoice.title}` : invoice.title}
        action={<DeleteInvoiceButton invoiceId={invoice.id} />}
      />

      <div className="-mt-3 mb-4 flex flex-wrap items-center gap-3 text-sm">
        <InvoiceStatusSelect invoiceId={invoice.id} status={invoice.status as InvoiceStatus} />
        {client?.name && <Link href={`/clients/${client.id}`} className="text-slate-600 hover:text-sea hover:underline">{client.name}</Link>}
        {project?.title && <Link href={`/projects/${project.id}`} className="text-slate-500 hover:text-sea hover:underline">{project.title}</Link>}
        {invoice.quote_id && (
          <Link href={`/calculator?quote=${invoice.quote_id}`} className="text-xs text-slate-400 hover:text-sea hover:underline">from quote</Link>
        )}
      </div>

      {/* Client-facing document: create/copy the private link, or open to print. */}
      <div className="mb-6">
        <ShareInvoiceControl invoiceId={invoice.id} token={(invoice.share_token as string | null) ?? null} />
      </div>

      {/* QuickBooks: sync + send through the owner's books. */}
      <div className="mb-6">
        <QuickbooksPanel
          invoiceId={invoice.id}
          connected={!!qboAccount}
          clientEmail={client?.email ?? null}
          qboDocNumber={(invoice.qbo_doc_number as string | null) ?? null}
          qboSyncError={(invoice.qbo_sync_error as string | null) ?? null}
          alreadySynced={!!invoice.qbo_invoice_id}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_16rem]">
        {/* Line items */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Rate</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">No line items.</td></tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 text-ink">{it.label}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{it.quantity}{it.unit ? ` ${it.unit}` : ''}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{money(it.rate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{money(it.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Total</td>
                <td className="px-4 py-3 text-right text-lg font-semibold text-slate-900">{money(invoice.total)}</td>
              </tr>
            </tfoot>
          </table>
          {invoice.notes && (
            <div className="border-t border-slate-100 px-4 py-3">
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Notes</p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Dates */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Issued</p>
            <p className="text-sm text-slate-700">{fmtDate(invoice.issue_date) ?? '—'}</p>
          </div>
          <form action={updateInvoiceDueDate} className="flex flex-col gap-1.5">
            <label htmlFor="due_date" className="text-xs uppercase tracking-wide text-slate-400">Due date</label>
            <input type="hidden" name="id" value={invoice.id} />
            <input
              id="due_date"
              name="due_date"
              type="date"
              defaultValue={invoice.due_date ?? ''}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal"
            />
            {overdue && <span className="text-xs font-medium text-red-600">Overdue</span>}
            <button type="submit" className="mt-1 self-start rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
              Save due date
            </button>
          </form>
        </aside>
      </div>
    </>
  );
}
