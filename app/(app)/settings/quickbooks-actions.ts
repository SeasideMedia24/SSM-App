'use server';

// Settings action for the QuickBooks connection. Disconnect forgets the stored
// tokens (the OAuth routes handle connecting). RLS-scoped to the owner.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function disconnectQuickbooks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('qbo_accounts').delete().eq('user_id', user.id);
  revalidatePath('/settings');
}
