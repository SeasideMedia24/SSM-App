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

  // An empty quote is allowed — it saves as a $0 placeholder the owner can fill
  // in later. Line items are only inserted when there are selections (below).
  const q = computeQuote(d.selections, roles, services, config);

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

  // Only insert line items when there are selections; an empty quote has none.
  if (q.lines.length > 0) {
    const { error: itemsError } = await supabase
      .from('quote_line_items')
      .insert(q.lines.map((line, i) => ({ ...line, quote_id: quoteId, position: i })));
    if (itemsError) return { error: 'The quote saved but its line items failed. Please reopen and try again.' };
  }

  // Deliverables typed in the calculator ARE the project's deliverables — one
  // source of truth, since the project view and the contract builder both read
  // this list. Reconcile by title: add new ones, update due dates on matches,
  // and remove ones the owner deleted here. (Editing a quote pre-loads the
  // project's deliverables, so the list is WYSIWYG — a deletion is intentional.)
  // Guard: an EMPTY list never wipes the project, so a quote saved without
  // touching deliverables can't clear them by accident.
  const projectId = values.project_id;
  if (projectId) {
    let list: { title: string; due: string | null }[] = [];
    let hadField = false;
    try {
      const raw = formData.get('deliverables_json');
      hadField = raw != null;
      const parsed = JSON.parse(String(raw ?? '[]'));
      if (Array.isArray(parsed)) {
        list = parsed
          .map((d) => ({ title: String(d?.title ?? '').trim(), due: (d?.due as string | null) || null }))
          .filter((d) => d.title !== '');
      }
    } catch { hadField = false; /* malformed — skip the sync rather than fail the save */ }

    if (hadField && list.length > 0) {
      const { data: existing } = await supabase
        .from('deliverables')
        .select('id, title')
        .eq('project_id', projectId);
      const rows = existing ?? [];
      const wanted = new Map(list.map((d) => [d.title.toLowerCase(), d]));
      const byTitle = new Map(rows.map((d) => [d.title.trim().toLowerCase(), d.id]));

      // Remove deliverables no longer in the list (status is lost, as intended).
      const toDelete = rows.filter((d) => !wanted.has(d.title.trim().toLowerCase())).map((d) => d.id);
      if (toDelete.length > 0) await supabase.from('deliverables').delete().in('id', toDelete);

      // Add the new ones.
      const toInsert = list.filter((d) => !byTitle.has(d.title.toLowerCase()));
      if (toInsert.length > 0) {
        await supabase.from('deliverables').insert(
          toInsert.map((d, i) => ({ project_id: projectId, title: d.title, due_date: d.due, position: rows.length + i })),
        );
      }
      // Update due dates on the ones that stayed.
      for (const d of list) {
        const existingId = byTitle.get(d.title.toLowerCase());
        if (existingId) await supabase.from('deliverables').update({ due_date: d.due }).eq('id', existingId);
      }
    }
  }

  revalidatePath('/calculator');
  revalidatePath('/dashboard');
  revalidatePath(`/clients/${values.client_id}`);
  // A quote feeds its project's budget, so refresh those views too — otherwise a
  // newly-saved quote wouldn't show up under the project until something else
  // revalidated it.
  if (values.project_id) {
    revalidatePath(`/projects/${values.project_id}`);
    revalidatePath('/projects/budget');
  }
  // ?saved=1 lets the calculator confirm the save and clear its local draft so
  // the next quote starts from a clean slate.
  redirect('/calculator?saved=1');
}

// Quick-add a client straight from the calculator, for when someone calls
// before there's a quote. Returns the new row so the calculator can select it
// without a full page reload. Validated server-side (CLAUDE.md rule #3).
export async function quickCreateClient(input: {
  name: string;
  company?: string;
}): Promise<
  | { ok: true; client: { id: string; name: string; company: string | null } }
  | { ok: false; error: string }
> {
  const name = (input?.name ?? '').trim();
  if (!name) return { ok: false, error: 'Client name is required.' };
  if (name.length > 200) return { ok: false, error: 'That name is too long.' };
  const company = (input?.company ?? '').trim() || null;

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('clients')
    .insert({ name, company, client_type: 'one_time' })
    .select('id, name, company')
    .single();
  if (error || !data) return { ok: false, error: 'Could not add the client. Please try again.' };

  revalidatePath('/calculator');
  revalidatePath('/clients');
  return { ok: true, client: data };
}

// Quick-add a project straight from the calculator, so a quote can always be
// attached to one (contracts live under a project). Mirrors quickCreateClient.
export async function quickCreateProject(input: {
  title: string;
  client_id: string;
}): Promise<
  | { ok: true; project: { id: string; title: string; client_id: string } }
  | { ok: false; error: string }
> {
  const title = (input?.title ?? '').trim();
  const clientId = (input?.client_id ?? '').trim();
  if (!clientId) return { ok: false, error: 'Choose a client first.' };
  if (!title) return { ok: false, error: 'Project name is required.' };
  if (title.length > 200) return { ok: false, error: 'That name is too long.' };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('projects')
    .insert({ title, client_id: clientId, status: 'idea_inquiry' })
    .select('id, title, client_id')
    .single();
  if (error || !data) return { ok: false, error: 'Could not add the project. Please try again.' };

  revalidatePath('/calculator');
  revalidatePath('/projects');
  return { ok: true, project: data };
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
