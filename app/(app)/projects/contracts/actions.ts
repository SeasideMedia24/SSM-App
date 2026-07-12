'use server';

// Server action for the "New contract" control on the global Contracts page.
// Same shape as the per-project addContract, but the project is picked in the
// form. Validated server-side; RLS-scoped like everything else.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type NewContractState = { ok: boolean; error: string | null };

export async function createContract(_prev: NewContractState, f: FormData): Promise<NewContractState> {
  const projectId = String(f.get('project_id') ?? '').trim();
  const title = String(f.get('title') ?? '').trim();
  if (!projectId) return { ok: false, error: 'Pick a project.' };
  if (!title) return { ok: false, error: 'Give the contract a name.' };

  const rawAmount = String(f.get('amount') ?? '').trim();
  const amount = rawAmount === '' ? null : Number(rawAmount);
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
    return { ok: false, error: 'The amount needs to be a positive number.' };
  }
  const signedRaw = String(f.get('signed_date') ?? '').trim();
  const signed_date = /^\d{4}-\d{2}-\d{2}$/.test(signedRaw) ? signedRaw : null;

  const supabase = await createClient();
  const { error } = await supabase.from('contracts').insert({
    project_id: projectId,
    title,
    amount,
    signed_date,
  });
  if (error) return { ok: false, error: 'Could not add the contract. Please try again.' };

  revalidatePath('/projects/contracts');
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, error: null };
}
