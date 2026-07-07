'use server';

// Server actions for the Production Price Calculator. The browser shows live
// totals for convenience, but the numbers STORED here are recomputed from the
// selections against rates fetched fresh from the database — the client's math
// is never trusted (CLAUDE.md rule #3).

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { calculatorQuoteSchema } from '@/lib/validation/calculator';
import { emptyToNull } from '@/lib/validation/client';
import { computeQuote, DISCOUNT_LABELS, type PricingConfig } from '@/lib/pricing/engine';

export type QuoteFormState = { error: string | null };

// Create (no id) or update (id present) a quote from calculator selections.
export async function saveQuote(_prev: QuoteFormState, formData: FormData): Promise<QuoteFormState> {
  const id = String(formData.get('id') ?? '').trim();

  let rawSelections: unknown;
  try {
    rawSelections = JSON.parse(String(formData.get('selections') ?? '{}'));
  } catch {
    return { error: 'The calculator state was malformed. Please try again.' };
  }

  const parsed = calculatorQuoteSchema.safeParse({
    title: formData.get('title'),
    client_id: formData.get('client_id'),
    project_id: formData.get('project_id') ?? '',
    notes: formData.get('notes'),
    selections: rawSelections,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }
  const d = parsed.data;

  const supabase = await createSupabaseServer();

  // Authoritative rates, fresh from the database.
  const [{ data: roles }, { data: services }, { data: configRows }] = await Promise.all([
    supabase.from('pricing_roles').select('*').order('sort'),
    supabase.from('pricing_page_services').select('*').order('sort'),
    supabase.from('pricing_config').select('*'),
  ]);
  if (!roles || !services || !configRows) {
    return { error: 'Could not load pricing rates. Has the pricing migration been applied?' };
  }
  const config: PricingConfig = Object.fromEntries(configRows.map((c) => [c.key, c.value]));

  const q = computeQuote(d.selections, roles, services, config);
  if (q.lines.length === 0) {
    return { error: 'Nothing is selected yet — pick at least one crew role or service.' };
  }

  // Note the applied discounts on the quote so they're visible later.
  let notes = emptyToNull(d.notes);
  if (d.selections.discounts.length > 0) {
    const parts = d.selections.discounts.map(
      (k) => `${DISCOUNT_LABELS[k]} −${config[`discount_${k}`] ?? 0}%`,
    );
    const note = `Discounts applied: ${parts.join(', ')}`;
    notes = notes ? `${notes}\n\n${note}` : note;
  }

  const values = {
    title: d.title.trim(),
    client_id: d.client_id,
    project_id: d.project_id && d.project_id !== '' ? d.project_id : null,
    notes,
    subtotal: q.overall, // pre-discount ("Overall Total" on the sheet)
    total: q.total, // after discounts ("Discount Total")
    calculator_state: d.selections,
  };

  let quoteId = id;
  if (id) {
    const { error } = await supabase.from('quotes').update(values).eq('id', id);
    if (error) return { error: 'Could not save the quote. Please try again.' };
    const { error: delError } = await supabase.from('quote_line_items').delete().eq('quote_id', id);
    if (delError) return { error: 'Could not update the line items. Please try again.' };
  } else {
    const { data, error } = await supabase.from('quotes').insert(values).select('id').single();
    if (error || !data) return { error: 'Could not create the quote. Please try again.' };
    quoteId = data.id;
  }

  const { error: itemsError } = await supabase
    .from('quote_line_items')
    .insert(q.lines.map((line, i) => ({ ...line, quote_id: quoteId, position: i })));
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

// Create (or replace) the private share link for a quote. A fresh random
// token invalidates any previously sent link.
export async function generateQuoteShareToken(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createSupabaseServer();
  await supabase.from('quotes').update({ share_token: crypto.randomUUID() }).eq('id', id);
  revalidatePath('/calculator');
}

// Turn a quote's share link off entirely.
export async function revokeQuoteShareToken(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createSupabaseServer();
  await supabase.from('quotes').update({ share_token: null }).eq('id', id);
  revalidatePath('/calculator');
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
