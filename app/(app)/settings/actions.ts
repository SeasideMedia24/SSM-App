'use server';

// Server actions for Settings — the pricing engine that feeds the Price
// Calculator. Changing anything here affects NEW quotes only; saved quotes
// keep the line amounts they were built with.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';

export type PricingFormState = { error: string | null };

const refresh = () => {
  revalidatePath('/settings');
  revalidatePath('/calculator');
};

// ---- Crew roles --------------------------------------------------------------

const roleSchema = z.object({
  name: z.string().trim().min(1, 'Give the role a name').max(200),
  day_rate: z.coerce.number().min(0).max(99999999),
  half_rate: z.coerce.number().min(0).max(99999999),
  hour_rate: z.coerce.number().min(0).max(99999999),
  has_quantity: z.coerce.boolean(),
});

export async function savePricingRole(_prev: PricingFormState, formData: FormData): Promise<PricingFormState> {
  const id = String(formData.get('id') ?? '').trim();
  const parsed = roleSchema.safeParse({
    name: formData.get('name'),
    day_rate: formData.get('day_rate'),
    half_rate: formData.get('half_rate'),
    hour_rate: formData.get('hour_rate'),
    has_quantity: formData.get('has_quantity') === 'on',
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check the role and try again.' };

  const supabase = await createSupabaseServer();
  const { error } = id
    ? await supabase.from('pricing_roles').update(parsed.data).eq('id', id)
    : await supabase.from('pricing_roles').insert({ ...parsed.data, kind: 'standard', sort: 500 });
  if (error) return { error: 'Could not save the role. Please try again.' };
  refresh();
  return { error: null };
}

// Delete a role. The UI confirms first (CLAUDE.md rule #4).
export async function deletePricingRole(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServer();
  await supabase.from('pricing_roles').delete().eq('id', id);
  refresh();
}

// ---- Page-minute services (pre/post) ------------------------------------------

const serviceSchema = z.object({
  name: z.string().trim().min(1, 'Give the service a name').max(200),
  phase: z.enum(['pre', 'post']),
  page_rate: z.coerce.number().min(0).max(99999999),
});

export async function savePricingService(_prev: PricingFormState, formData: FormData): Promise<PricingFormState> {
  const id = String(formData.get('id') ?? '').trim();
  const parsed = serviceSchema.safeParse({
    name: formData.get('name'),
    phase: formData.get('phase'),
    page_rate: formData.get('page_rate'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Please check the service and try again.' };

  const supabase = await createSupabaseServer();
  const { error } = id
    ? await supabase.from('pricing_page_services').update(parsed.data).eq('id', id)
    : await supabase.from('pricing_page_services').insert({ ...parsed.data, sort: 500 });
  if (error) return { error: 'Could not save the service. Please try again.' };
  refresh();
  return { error: null };
}

export async function deletePricingService(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServer();
  await supabase.from('pricing_page_services').delete().eq('id', id);
  refresh();
}

// ---- Single-number config (markup, rental tiers, discounts, fees) -------------

// Whitelist of editable keys — matches the seeds in the pricing migration.
const CONFIG_KEYS = new Set([
  'markup', 'about_us_fee', 'short_rate',
  'rental_low', 'rental_medium_low', 'rental_medium', 'rental_high',
  'discount_referral', 'discount_first_time', 'discount_military',
  'actor_high', 'actor_medium', 'actor_low', 'permit',
]);

export async function savePricingConfig(_prev: PricingFormState, formData: FormData): Promise<PricingFormState> {
  const supabase = await createSupabaseServer();
  for (const [key, raw] of formData.entries()) {
    if (!CONFIG_KEYS.has(key)) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 99999999) {
      return { error: `"${key.replaceAll('_', ' ')}" needs a valid number.` };
    }
    const { error } = await supabase.from('pricing_config').upsert({ key, value });
    if (error) return { error: 'Could not save the numbers. Please try again.' };
  }
  refresh();
  return { error: null };
}
