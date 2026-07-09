'use server';

// Server actions for the Inquiries page. Signed-in only (RLS enforces this —
// the "onboarding: all for authenticated" policy).

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Move a submission between 'new', 'reviewed', and 'archived'. Bound to the
// small forms on the Inquiries page; the hidden "status" field carries the
// target status. Archiving keeps the record but moves it out of the active
// lists into the archival view.
const INQUIRY_STATUSES = new Set(['new', 'reviewed', 'archived']);

export async function setInquiryStatus(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  if (!id || !INQUIRY_STATUSES.has(status)) return;

  const supabase = await createClient();
  await supabase.from('onboarding_submissions').update({ status }).eq('id', id);
  revalidatePath('/inquiries');
}
