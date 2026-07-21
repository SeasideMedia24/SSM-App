'use server';

// Owner actions for the client portal link. Mirrors the invoice/quote share
// tokens: a fresh random token creates (and so invalidates the previous) link.
// The portal itself is anonymous and gated by this token.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PortalResult = { ok: true; token: string | null } | { ok: false; error: string };

const MIGRATION_HINT =
  'The client portal needs a quick database update — run supabase/migrations/20260717000001_client_portal.sql in the Supabase SQL Editor, then try again.';

const isMissingTable = (code?: string) => code === '42P01' || code === '42703';

export async function generatePortalToken(projectId: string): Promise<PortalResult> {
  if (typeof projectId !== 'string' || projectId.length === 0) return { ok: false, error: 'Missing project.' };
  const supabase = await createClient();
  const token = crypto.randomUUID();
  const { error } = await supabase
    .from('client_portal')
    .upsert({ project_id: projectId, portal_token: token }, { onConflict: 'project_id' });
  if (error) return { ok: false, error: isMissingTable(error.code) ? MIGRATION_HINT : 'Could not create the link. Please try again.' };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, token };
}

// Set (or clear) the "files ready to review" link — e.g. a Frame.io URL. Shown
// to the client on the portal only once it's set. Empty string clears it.
export type ReviewLinkResult = { ok: true; url: string | null } | { ok: false; error: string };

export async function setReviewLink(projectId: string, rawUrl: string): Promise<ReviewLinkResult> {
  if (typeof projectId !== 'string' || projectId.length === 0) return { ok: false, error: 'Missing project.' };
  const url = (rawUrl ?? '').trim();
  if (url !== '' && !/^https?:\/\/.+/i.test(url)) {
    return { ok: false, error: 'Enter a full link starting with https://' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('client_portal')
    .upsert({ project_id: projectId, review_link: url || null }, { onConflict: 'project_id' });
  if (error) return { ok: false, error: isMissingTable(error.code) ? MIGRATION_HINT : 'Could not save the link. Please try again.' };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, url: url || null };
}

export async function revokePortalToken(projectId: string): Promise<PortalResult> {
  if (typeof projectId !== 'string' || projectId.length === 0) return { ok: false, error: 'Missing project.' };
  const supabase = await createClient();
  const { error } = await supabase.from('client_portal').update({ portal_token: null }).eq('project_id', projectId);
  if (error) return { ok: false, error: isMissingTable(error.code) ? MIGRATION_HINT : 'Could not turn the link off. Please try again.' };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, token: null };
}
