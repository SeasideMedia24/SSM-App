'use server';

// Server actions for the Price Calculator. All quote math happens HERE, not in
// the browser — the UI's live totals are a convenience; the numbers stored come
// from this file (amount = quantity × rate, subtotal = sum, total = subtotal).

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { quoteSchema } from '@/lib/validation/quote';
import { emptyToNull } from '@/lib/validation/client';

export type QuoteFormState = { error: string | null };

const round2 = (n: number) => Math.round(n * 100) / 100;

// Create (no id) or update (id present) a quote and its line items.
export async function saveQuote(_prev: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const id = String(formData.get('id') ?? '').trim();

  // The builder serializes its rows into one JSON field.
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get('items') ?? '[]'));
  } catch {
    return { error: 'Line items were malformed. Please try again.' };
  }

  const parsed = quoteSchema.safeParse({
    title: formData.get('title'),
    client_id: formData.get('client_id'),
    project_id: formData.get('project_id') ?? '',
    notes: formData.get('notes'),
    items: rawItems,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }
  const d = parsed.data;

  // Server-side math — the stored numbers always come from here.
  const items = d.items.map((it, i) => ({
    label: it.label.trim(),
    quantity: round2(it.quantity),
    unit: emptyToNull(it.unit),
    rate: round2(it.rate),
    amount: round2(it.quantity * it.rate),
    position: i,
  }));
  const subtotal = round2(items.reduce((sum, it) => sum + it.amount, 0));
  const total = subtotal; // v1: no tax/discount — total mirrors subtotal.

  const values = {
    title: d.title.trim(),
    client_id: d.client_id,
    project_id: d.project_id && d.project_id !== '' ? d.project_id : null,
    notes: emptyToNull(d.notes),
    subtotal,
    total,
  };

  const supabase = await createSupabaseServer();

  let quoteId = id;
  if (id) {
    const { error } = await supabase.from('quotes').update(values).eq('id', id);
    if (error) return { error: 'Could not save the quote. Please try again.' };
    // Replace line items wholesale — simplest correct update for a small list.
    const { error: delError } = await supabase.from('quote_line_items').delete().eq('quote_id', id);
    if (delError) return { error: 'Could not update the line items. Please try again.' };
  } else {
    const { data, error } = await supabase.from('quotes').insert(values).select('id').single();
    if (error || !data) return { error: 'Could not create the quote. Please try again.' };
    quoteId = data.id;
  }

  const { error: itemsError } = await supabase
    .from('quote_line_items')
    .insert(items.map((it) => ({ ...it, quote_id: quoteId })));
  if (itemsError) return { error: 'The quote saved but its line items failed. Please reopen and try again.' };

  revalidatePath('/calculator');
  revalidatePath('/dashboard');
  revalidatePath(`/clients/${values.client_id}`);
  redirect('/calculator');
}

// Flip a quote between draft / sent / accepted / declined.
export async function setQuoteStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim() as 'draft' | 'sent' | 'accepted' | 'declined';
  if (!id || !['draft', 'sent', 'accepted', 'declined'].includes(status)) return;

  const supabase = await createSupabaseServer();
  await supabase.from('quotes').update({ status }).eq('id', id);
  revalidatePath('/calculator');
  revalidatePath('/dashboard');
}

// Delete a quote (line items cascade). The UI must confirm before calling this
// (CLAUDE.md rule #4).
export async function deleteQuote(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createSupabaseServer();
  await supabase.from('quotes').delete().eq('id', id);
  revalidatePath('/calculator');
  revalidatePath('/dashboard');
}
