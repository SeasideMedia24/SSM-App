'use server';

// Dashboard archive actions. Both sections (PaePae activity, Recent quotes)
// show the newest 10 unarchived items; these tuck an item into (or pull it back
// out of) the collapsed Archive below. Quote archiving is DASHBOARD-ONLY — the
// Calculator's saved-quotes list is untouched.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const MIGRATION_HINT =
  'Archiving needs a quick database update — run supabase/migrations/20260722000001_dashboard_archives.sql in the Supabase SQL Editor, then try again.';

export type ArchiveResult = { ok: true } | { ok: false; error: string };

export async function setPaepaeActionArchived(id: string, archived: boolean): Promise<ArchiveResult> {
  if (typeof id !== 'string' || id.length === 0) return { ok: false, error: 'Missing item.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('paepae_actions')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) return { ok: false, error: error.code === '42703' ? MIGRATION_HINT : 'Could not archive. Please try again.' };
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function setQuoteDashboardArchived(id: string, archived: boolean): Promise<ArchiveResult> {
  if (typeof id !== 'string' || id.length === 0) return { ok: false, error: 'Missing quote.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('quotes')
    .update({ dashboard_archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) return { ok: false, error: error.code === '42703' ? MIGRATION_HINT : 'Could not archive. Please try again.' };
  revalidatePath('/dashboard');
  return { ok: true };
}
