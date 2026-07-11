'use server';

// Server actions for the Google Calendar section on Settings. RLS scopes both
// tables to the signed-in user.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Choose which calendars feed the dashboard (e.g. only "Home" for Personal).
export async function setCalendarIncluded(calendarId: string, included: boolean) {
  if (typeof calendarId !== 'string' || calendarId.length === 0) return;
  const supabase = await createClient();
  await supabase.from('google_calendars').update({ included: Boolean(included) }).eq('id', calendarId);
  revalidatePath('/settings');
  revalidatePath('/dashboard');
}

// Disconnect entirely: forget the tokens and the mirrored calendar list.
// (Reconnecting later just repeats the consent flow.)
export async function disconnectGoogle() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('google_calendars').delete().eq('user_id', user.id);
  await supabase.from('google_accounts').delete().eq('user_id', user.id);
  revalidatePath('/settings');
  revalidatePath('/dashboard');
}
