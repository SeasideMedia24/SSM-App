import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { InvoiceStatusSelect } from '@/components/invoices/invoice-status-select';
import { money, fmtDate } from '@/lib/projects/format';
import type { InvoiceStatus } from '@/types/database.types';

// An invoice is overdue when it's been sent but not paid and its due date has
// passed. Derived here, not stored.
function isOverdue(status: string, dueDate: string | null, today: string): boolean {
  return status === 'sent' && !!dueDate && dueDate < today;
}

export default async function InvoicesPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, title, status, total, due_date, created_at, clients ( name )')
    .order('created_at', { ascending: false });

  const invoices = data ?? [];
  const outstanding = invoices
    .filter((i) => i.status !== 'paid')
    .reduce((sum, i) => sum + (i.total ?? 0), 0);
  const overdueCount = invoices.filter((i) => isOverdue(i.status, i.due_date, today)).length;

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Generated from quotes. Track what's been sent, what's paid, and what's overdue."
      />

      {invoices.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Outstanding" value={money(outstanding)} />
          <Stat label="Overdue" value={String(overdueCount)} tone={overdueCount > 0 ? 'warn' : undefined} />
          <Stat label="Total invoices" value={String(invoices.length)} />
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Couldn’t load invoices. Please refresh the page.</p>
      )}

      {!error && invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-slate-500">No invoices yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Create one from a saved quote in the{' '}
            <Link href="/calculator" className="text-sea underline">Price Calculator</Link>.
          </p>
        </div>
      ) : (
        !error && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => {
                  const clientName = (i.clients as unknown as { name: string } | null)?.name ?? '—';
                  const overdue = isOverdue(i.status, i.due_date, today);
                  return (
                    <tr key={i.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${i.id}`} className="font-medium text-slate-900 hover:underline">
                          {i.invoice_number ? `${i.invoice_number} · ` : ''}{i.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{clientName}</td>
                      <td className="px-4 py-3">
                        <InvoiceStatusSelect invoiceId={i.id} status={i.status as InvoiceStatus} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{money(i.total)}</td>
                      <td className="px-4 py-3">
                        <span className={overdue ? 'font-medium text-red-600' : 'text-slate-500'}>
                          {fmtDate(i.due_date) ?? '—'}
                          {overdue && ' · overdue'}
                        </span>
                      </td>
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-2xl font-semibold ${tone === 'warn' ? 'text-red-600' : 'text-ink'}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
