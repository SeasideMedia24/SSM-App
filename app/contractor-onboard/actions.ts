'use server';

// Handles a contractor completing their own details via an invite link. Runs on
// the server with the admin client (the visitor is anonymous, so RLS would
// otherwise block the token lookup). Like the client onboarding fix, this only
// FILLS BLANK fields — a link can never overwrite details the owner already set,
// and an already-onboarded link is rejected.

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseRate } from '@/lib/validation/contractor';

export type ContractorOnboardState = { ok: boolean; error: string | null };

const schema = z.object({
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]).optional(),
  phone: z.string().trim().max(50).optional(),
  role: z.string().trim().max(200).optional(),
});

const clean = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null);
const keep = (current: string | null, incoming: string | null) =>
  current && current.trim() !== '' ? current : incoming;

export async function submitContractorOnboarding(
  _prev: ContractorOnboardState,
  formData: FormData,
): Promise<ContractorOnboardState> {
  // Honeypot: real people leave this hidden field empty.
  if (String(formData.get('website') ?? '').trim() !== '') return { ok: true, error: null };

  const token = String(formData.get('token') ?? '').trim();
  if (!token) return { ok: false, error: 'This link isn’t active.' };

  const parsed = schema.safeParse({
    email: formData.get('email'),
    phone: formData.get('phone'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('contractors')
    .select('email, phone, role, rate_full, rate_half, rate_hourly, onboarded_at')
    .eq('onboard_token', token)
    .single();
  if (!existing) return { ok: false, error: 'This link isn’t active — it may have already been used.' };
  if (existing.onboarded_at) return { ok: false, error: 'This link has already been used.' };

  // Fill blanks only; keep anything the owner already entered.
  await admin
    .from('contractors')
    .update({
      email: keep(existing.email, clean(parsed.data.email)),
      phone: keep(existing.phone, clean(parsed.data.phone)),
      role: keep(existing.role, clean(parsed.data.role)),
      rate_full: existing.rate_full ?? parseRate(formData.get('rate_full')),
      rate_half: existing.rate_half ?? parseRate(formData.get('rate_half')),
      rate_hourly: existing.rate_hourly ?? parseRate(formData.get('rate_hourly')),
      onboarded_at: new Date().toISOString(),
      onboard_token: null, // single-use
    })
    .eq('onboard_token', token);

  return { ok: true, error: null };
}
