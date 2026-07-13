// Who is the signed-in user, role-wise? (Slice B1: 'owner' vs 'contractor'.)
//
// The database is the real wall — RLS policies check profiles.role via the
// app_role() SQL helper regardless of what the app does. This TS helper exists
// for ROUTING and gating UI/API surfaces: sending contractors to My Work,
// keeping PaePae and the Google connection owner-only, etc.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export type AppRole = 'owner' | 'contractor';

// Returns the caller's role, or null when signed out / no profile row.
// Anything unexpected in the column is treated as 'contractor' — least
// privilege is the safe default.
export async function getAppRole(supabase: SupabaseClient<Database>): Promise<AppRole | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!data) return null;
  return data.role === 'owner' ? 'owner' : 'contractor';
}
