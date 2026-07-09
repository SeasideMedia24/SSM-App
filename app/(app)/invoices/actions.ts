'use server';

// Server actions for invoices. An invoice is generated from a quote (copying its
// line items + total), then moves draft → sent → paid. All access is RLS-scoped
// through the server Supabase client. Input is validated server-side.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { createInvoiceFromQuoteId } from '@/lib/invoices/create';
import type { InvoiceStatus } from '@/types/database.types';

// Create a draft invoice from an existing quote, then open it. The copy logic is
// shared with PaePae's create_invoice action (lib/invoices/create.ts).
export async function createInvoiceFromQuote(formData: FormData) {
  const quoteId = String(formData.get('quote_id') ?? '').trim();
  if (!quoteId) redirect('/calculator');

  const supabase = await createSupabaseServer();
  const invoice = await createInvoiceFromQuoteId(supabase, quoteId).catch(() => null);
  if (!invoice) redirect('/calculator');

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
