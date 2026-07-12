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

// ── Share links (private, unguessable) ──────────────────────────────────────
// Mirrors quote sharing: a fresh random token replaces (and so invalidates) any
// previously sent link. These return a result object so the UI can show a
// helpful message when the share_token migration hasn't been applied yet.

export type ShareResult = { ok: true; token: string | null } | { ok: false; error: string };

const MIGRATION_HINT =
  'Share links need a quick database update — run supabase/migrations/20260711000002_invoice_share.sql in the Supabase SQL Editor, then try again.';

export async function generateInvoiceShareToken(invoiceId: string): Promise<ShareResult> {
  if (typeof invoiceId !== 'string' || invoiceId.length === 0) {
    return { ok: false, error: 'Missing invoice.' };
  }
  const supabase = await createSupabaseServer();
  const token = crypto.randomUUID();
  const { error } = await supabase.from('invoices').update({ share_token: token }).eq('id', invoiceId);
  if (error) {
    // 42703 = column doesn't exist yet (migration not applied).
    return { ok: false, error: error.code === '42703' ? MIGRATION_HINT : 'Could not create the link. Please try again.' };
  }
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true, token };
}

export async function revokeInvoiceShareToken(invoiceId: string): Promise<ShareResult> {
  if (typeof invoiceId !== 'string' || invoiceId.length === 0) {
    return { ok: false, error: 'Missing invoice.' };
  }
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from('invoices').update({ share_token: null }).eq('id', invoiceId);
  if (error) {
    return { ok: false, error: error.code === '42703' ? MIGRATION_HINT : 'Could not turn the link off. Please try again.' };
  }
  revalidatePath(`/invoices/${invoiceId}`);
  return { ok: true, token: null };
}
