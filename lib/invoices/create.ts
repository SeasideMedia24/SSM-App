// Shared "generate an invoice from a quote" logic, used by both the calculator's
// Create-invoice button and PaePae's create_invoice action, so there's one code
// path. Copies the quote's client/project, title, totals, notes, and every line
// item into a new DRAFT invoice. RLS-scoped through the caller's client.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type DB = SupabaseClient<Database>;

// Default payment terms (net-14) when no due date is given.
const DEFAULT_NET_DAYS = 14;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function createInvoiceFromQuoteId(
  supabase: DB,
  quoteId: string,
  opts?: { dueDate?: string },
): Promise<{ id: string; title: string; total: number }> {
  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select('id, title, client_id, project_id, subtotal, total, notes')
    .eq('id', quoteId)
    .single();
  if (qErr || !quote) throw new Error('That quote no longer exists.');

  const { data: lines } = await supabase
    .from('quote_line_items')
    .select('label, quantity, unit, rate, amount, position')
    .eq('quote_id', quoteId)
    .order('position');

  // Simple sequential invoice number (single-user; fine without a DB sequence).
  const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true });
  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`;

  const now = new Date();
  const dueDate = opts?.dueDate ?? iso(new Date(now.getTime() + DEFAULT_NET_DAYS * 86400000));

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      client_id: quote.client_id,
      project_id: quote.project_id,
      quote_id: quote.id,
      invoice_number: invoiceNumber,
      title: quote.title,
      status: 'draft',
      notes: quote.notes,
      subtotal: quote.subtotal,
      total: quote.total,
      issue_date: iso(now),
      due_date: dueDate,
    })
    .select('id, title, total')
    .single();
  if (error || !invoice) throw new Error(error?.message ?? 'Could not create the invoice.');

  if (lines && lines.length > 0) {
    const { error: liErr } = await supabase
      .from('invoice_line_items')
      .insert(lines.map((l) => ({ ...l, invoice_id: invoice.id })));
    if (liErr) {
      // Don't leave a half-made invoice behind if line items failed.
      await supabase.from('invoices').delete().eq('id', invoice.id);
      throw new Error(liErr.message);
    }
  }

  return invoice;
}
