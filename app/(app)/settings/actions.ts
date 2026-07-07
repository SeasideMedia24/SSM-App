'use server';

// Server actions for Settings — rate preset management. Presets feed the
// Price Calculator's "Add from preset" dropdown; edit them here, and every
// new quote picks up the new numbers (saved quotes keep theirs).

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';

export type PresetFormState = { error: string | null };

const presetSchema = z.object({
  label: z.string().trim().min(1, 'Give the preset a name').max(200),
  unit: z.string().trim().min(1, 'Add a unit (day, hour, deliverable…)').max(50),
  default_rate: z.coerce.number().min(0, 'Rate can’t be negative').max(99999999),
});

// Create (no id) or update (id present) a rate preset.
export async function savePreset(_prev: PresetFormState, formData: FormData): Promise<PresetFormState> {
  const id = String(formData.get('id') ?? '').trim();

  const parsed = presetSchema.safeParse({
    label: formData.get('label'),
    unit: formData.get('unit'),
    default_rate: formData.get('default_rate'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the preset and try again.' };
  }
  const values = {
    label: parsed.data.label.trim(),
    unit: parsed.data.unit.trim(),
    default_rate: Math.round(parsed.data.default_rate * 100) / 100,
  };

  const supabase = await createSupabaseServer();
  const { error } = id
    ? await supabase.from('rate_presets').update(values).eq('id', id)
    : await supabase.from('rate_presets').insert(values);
  if (error) return { error: 'Could not save the preset. Please try again.' };

  revalidatePath('/settings');
  revalidatePath('/calculator');
  return { error: null };
}

// Delete a preset. The UI confirms first (CLAUDE.md rule #4). Saved quotes are
// unaffected — their line items store their own copied rates.
export async function deletePreset(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createSupabaseServer();
  await supabase.from('rate_presets').delete().eq('id', id);
  revalidatePath('/settings');
  revalidatePath('/calculator');
}
