'use server';

// Server actions for the Inquiries page. Signed-in only (RLS enforces this —
// the "onboarding: all for authenticated" policy).

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Flip a submission between 'new' and 'reviewed'. Bound to the small forms on
// the Inquiries page; the hidden "status" field carries the target status.
export async function setInquiryStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  if (!id || (status !== 'new' && status !== 'reviewed')) return;

  const supabase = await createClient();
  await supabase.from('onboarding_submissions').update({ status }).eq('id', id);
  revalidatePath('/inquiries');
}
