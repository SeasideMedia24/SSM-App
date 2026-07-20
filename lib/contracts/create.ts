// Build a DRAFT contract pre-filled from an approved quote and its project's
// deliverables — the "quote → contract" step of the client journey. Amounts
// default from the quote total (deposit 50%, the balance after production, $0 on
// delivery); everything is editable in the contract editor before sending.
//
// Contracts belong to a project, so the quote must be attached to one first.
// RLS-scoped through the caller's client.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type DB = SupabaseClient<Database>;

export async function buildContractFromQuote(
  supabase: DB,
  quoteId: string,
): Promise<{ id: string; project_id: string }> {
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, title, client_id, project_id, total')
    .eq('id', quoteId)
    .single();
  if (error || !quote) throw new Error('That quote no longer exists.');
  if (!quote.project_id) {
    throw new Error('Attach this quote to a project first, then generate the contract.');
  }

  // Reuse an existing unsigned contract for this quote instead of piling up a new
  // draft every time "Create contract" is clicked. A signed one is left alone.
  const { data: existing } = await supabase
    .from('contracts')
    .select('id, project_id')
    .eq('quote_id', quote.id)
    .neq('status', 'signed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing;

  // Seed the contract's deliverable lines from the project's deliverables. The
  // owner edits this snapshot in the editor; it's independent of the live table.
  const { data: deliverables } = await supabase
    .from('deliverables')
    .select('title, due_date')
    .eq('project_id', quote.project_id)
    .order('position');

  const total = Number(quote.total ?? 0);
  const deposit = Math.round(total * 50) / 100; // 50% to 2dp
  const production = Math.round((total - deposit) * 100) / 100; // remaining balance
  const delivery = 0;

  const { data: contract, error: cErr } = await supabase
    .from('contracts')
    .insert({
      project_id: quote.project_id,
      quote_id: quote.id,
      title: quote.title,
      status: 'draft',
      amount: total,
      deposit_amount: deposit,
      production_amount: production,
      delivery_amount: delivery,
      revision_rounds: 2,
      revision_pct: 100,
      deliverables_snapshot: (deliverables ?? []).map((d) => ({ title: d.title, due: d.due_date })),
    })
    .select('id, project_id')
    .single();
  if (cErr || !contract) throw new Error(cErr?.message ?? 'Could not create the contract.');
  return contract;
}
