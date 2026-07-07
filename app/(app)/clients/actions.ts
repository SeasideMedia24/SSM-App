'use server';

// Server actions for creating, updating, and deleting clients.
// All data access goes through the server Supabase client, so RLS applies.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { clientSchema, emptyToNull } from '@/lib/validation/client';

export type ClientFormState = { error: string | null };

// Create (when no id) or update (when id present) a client. Bound to the form
// via React's useActionState in components/client-form.tsx.
export async function saveClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const id = String(formData.get('id') ?? '').trim();

  const parsed = clientSchema.safeParse({
    name: formData.get('name'),
    company: formData.get('company'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    notes: formData.get('notes'),
    client_type: formData.get('client_type') || undefined,
  });

  if (!parsed.success) {
    // Show the first validation message.
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }

  const values = {
    name: parsed.data.name.trim(),
    company: emptyToNull(parsed.data.company),
    email: emptyToNull(parsed.data.email),
    phone: emptyToNull(parsed.data.phone),
    notes: emptyToNull(parsed.data.notes),
    client_type: parsed.data.client_type ?? 'one_time',
  };

  const supabase = await createSupabaseServer();

  let savedId = id;
  if (id) {
    const { error } = await supabase.from('clients').update(values).eq('id', id);
    if (error) return { error: 'Could not save changes. Please try again.' };
  } else {
    const { data, error } = await supabase
      .from('clients')
      .insert(values)
      .select('id')
      .single();
    if (error || !data) return { error: 'Could not create the client. Please try again.' };
    savedId = data.id;
  }

  revalidatePath('/clients');
  redirect(`/clients/${savedId}`);
}

// Generate (or refresh) a private onboarding invite token for a client. The
// owner shares the resulting /onboard/<token> link; the client completes their
// own details, which updates this record.
export async function generateOnboardToken(clientId: string) {
  if (!clientId) return;
  const supabase = await createSupabaseServer();
  await supabase.from('clients').update({ onboard_token: crypto.randomUUID() }).eq('id', clientId);
  revalidatePath(`/clients/${clientId}`);
}

// Delete a client. The UI must confirm before calling this (CLAUDE.md rule #4).
export async function deleteClient(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) {
    // Send the user back to the client with an error flag in the URL.
    redirect(`/clients/${id}?error=delete`);
  }

  revalidatePath('/clients');
  redirect('/clients');
}
