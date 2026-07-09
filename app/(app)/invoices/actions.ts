'use server';

// Server actions for invoices. An invoice is generated from a quote (copying its
// line items + total), then moves draft → sent → paid. All access is RLS-scoped
// through the server Supabase client. Input is validated server-side.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import type { InvoiceStatus } from '@/types/database.types';

// Default payment terms when generating an invoice (net-14).
const DEFAULT_NET_DAYS = 14;
const iso = (d: Date) => d.toISOString().slice(0, 10);

// Create a draft invoice from an existing quote: copies the client, project,
// title, totals, notes, and every line item. Redirects to the new invoice.
export async function createInvoiceFromQuote(formData: FormData) {
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect('/calculator');

  const supabase = await createSupabaseServer();

  const { data: quote } = await supabase
    .from('quotes')
    .select('id, title, client_id, project_id, subtotal, total, notes')
    .eq('id', quoteId)
    .single();
  if (!quote) redirect('/calculator');

  const { data: lines } = await supabase
    .from('quote_line_items')
    .select('label, quantity, unit, rate, amount, position')
    .eq('quote_id', quoteId)
    .order('position');

  // Simple sequential invoice number (single-user; fine without a sequence).
  const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true });
  const invoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, '0')}`;

  const now = new Date();
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
      due_date: iso(new Date(now.getTime() + DEFAULT_NET_DAYS * 86400000)),
    })
    .select('id')
    .single();
  if (error || !invoice) redirect('/calculator');

  if (lines && lines.length > 0) {
    await supabase.from('invoice_line_items').insert(lines.map((l) => ({ ...l, invoice_id: invoice.id })));
  }

  revalidatePath('/invoices');
  revalidatePath('/dashboard');
  redirect(`/invoices/${invoice.id}`);
}

// Move an invoice between draft / sent / paid, stamping the sent/paid dates.
export async function setInvoiceStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  if (!id || !['draft', 'sent', 'paid'].includes(status)) return;

  const supabase = await createSupabaseServer();
  const patch: { status: InvoiceStatus; sent_at?: string; paid_at?: string } = { status: status as InvoiceStatus };
  const nowIso = new Date().toISOString();
  if (status === 'sent') patch.sent_at = nowIso;
  if (status === 'paid') patch.paid_at = nowIso;

  await supabase.from('invoices').update(patch).eq('id', id);
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/dashboard');
}

// Edit an invoice's due date (drives the "overdue" flag).
export async function updateInvoiceDueDate(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  const due = String(formData.get('due_date') ?? '').trim();
  if (!id) return;

  const supabase = await createSupabaseServer();
  await supabase.from('invoices').update({ due_date: due || null }).eq('id', id);
  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/dashboard');
}

// Delete an invoice (line items cascade). The UI confirms first (CLAUDE.md #4).
export async function deleteInvoice(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createSupabaseServer();
  await supabase.from('invoices').delete().eq('id', id);
  revalidatePath('/invoices');
  revalidatePath('/dashboard');
  redirect('/invoices');
}
