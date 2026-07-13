'use server';

// A contractor updating their own details. RLS ("contractors: self update")
// limits them to their own row, and the contractor_self_update_guard trigger
// limits WHICH columns (contact + rates — never type/linkage/onboarding).

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseRate } from '@/lib/validation/contractor';

export type MyProfileState = { ok: boolean; error: string | null };

const schema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(200),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
  phone: z.string().trim().max(50),
  role: z.string().trim().max(200),
});

export async function updateMyProfile(_prev: MyProfileState, formData: FormData): Promise<MyProfileState> {
  const parsed = schema.safeParse({
    name: formData.get('name') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    role: formData.get('role') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'You’ve been signed out — log in again.' };

  const { error } = await supabase
    .from('contractors')
    .update({
      name: parsed.data.name,
      email: parsed.data.email === '' ? null : parsed.data.email,
      phone: parsed.data.phone === '' ? null : parsed.data.phone,
      role: parsed.data.role === '' ? null : parsed.data.role,
      rate_full: parseRate(formData.get('rate_full')),
      rate_half: parseRate(formData.get('rate_half')),
      rate_hourly: parseRate(formData.get('rate_hourly')),
    })
    .eq('user_id', user.id);
  if (error) return { ok: false, error: 'Could not save. Please try again.' };

  revalidatePath('/my-profile');
  return { ok: true, error: null };
}
