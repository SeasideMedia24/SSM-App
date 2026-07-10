'use server';

// Server actions for contractors/team (Slice A: owner-managed, no logins yet).
// All access goes through the server Supabase client, so RLS applies.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { contractorSchema, parseRate } from '@/lib/validation/contractor';
import { emptyToNull } from '@/lib/validation/client';

export type ContractorFormState = { error: string | null };

// Create (no id) or update (id present) a contractor.
export async function saveContractor(_prev: ContractorFormState, formData: FormData): Promise<ContractorFormState> {
  const id = String(formData.get('id') ?? '').trim();

  const parsed = contractorSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    type: formData.get('type') || undefined,
    role: formData.get('role'),
    rate_unit: formData.get('rate_unit'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }

  const values = {
    name: parsed.data.name.trim(),
    email: emptyToNull(parsed.data.email),
    phone: emptyToNull(parsed.data.phone),
    type: parsed.data.type ?? 'external',
    role: emptyToNull(parsed.data.role),
    rate_full: parseRate(formData.get('rate_full')),
    rate_half: parseRate(formData.get('rate_half')),
    rate_hourly: parseRate(formData.get('rate_hourly')),
    notes: emptyToNull(parsed.data.notes),
  };

  const supabase = await createSupabaseServer();

  let savedId = id;
  if (id) {
    const { error } = await supabase.from('contractors').update(values).eq('id', id);
    if (error) return { error: 'Could not save changes. Please try again.' };
  } else {
    const { data, error } = await supabase.from('contractors').insert(values).select('id').single();
    if (error || !data) return { error: 'Could not create the contractor. Please try again.' };
    savedId = data.id;
  }

  revalidatePath('/contractors');
  redirect(`/contractors/${savedId}`);
}

// Delete a contractor (their assignments cascade). UI confirms first (CLAUDE.md #4).
export async function deleteContractor(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from('contractors').delete().eq('id', id);
  if (error) redirect(`/contractors/${id}?error=delete`);

  revalidatePath('/contractors');
  redirect('/contractors');
}

// Generate (or refresh) a private self-onboarding link for a contractor. The
// owner shares the resulting /contractor-onboard/<token> link; the contractor
// fills in their own contact details and rates (no login).
export async function generateContractorOnboardToken(formData: FormData) {
  const contractorId = String(formData.get('id') ?? '').trim();
  if (!contractorId) return;

  const supabase = await createSupabaseServer();
  await supabase.from('contractors').update({ onboard_token: crypto.randomUUID() }).eq('id', contractorId);
  revalidatePath(`/contractors/${contractorId}`);
}

// Assign a contractor to a project with an optional rate (falls back to the
// contractor's default rate). Idempotent on (project, contractor).
export async function assignProject(formData: FormData) {
  const contractorId = String(formData.get('contractor_id') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim();
  if (!contractorId || !projectId) return;

  const supabase = await createSupabaseServer();
  await supabase.from('project_contractors').upsert(
    {
      contractor_id: contractorId,
      project_id: projectId,
      role: emptyToNull(String(formData.get('role') ?? '')),
      rate: parseRate(formData.get('rate')),
      rate_unit: emptyToNull(String(formData.get('rate_unit') ?? '')),
    },
    { onConflict: 'project_id,contractor_id' },
  );

  revalidatePath(`/contractors/${contractorId}`);
  revalidatePath(`/projects/${projectId}`);
}

// Remove a single assignment by its id.
export async function unassignProject(formData: FormData) {
  const assignmentId = String(formData.get('assignment_id') ?? '').trim();
  const contractorId = String(formData.get('contractor_id') ?? '').trim();
  if (!assignmentId) return;

  const supabase = await createSupabaseServer();
  await supabase.from('project_contractors').delete().eq('id', assignmentId);

  if (contractorId) revalidatePath(`/contractors/${contractorId}`);
}
