'use server';

// Booking the creative kickoff from the client portal. Anonymous surface, so
// this runs through the admin client and is gated by the portal token. It uses
// the OWNER's Google connection (via the admin client) to read availability and
// book the event. Re-checks availability at book time to prevent double-booking.

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';
import { freeBusy } from '@/lib/google/calendar';
import { createCalendarEvent } from '@/lib/google/act';
import { generateSlots, KICKOFF_CONFIG } from '@/lib/scheduling/slots';

export type BookResult = { ok: true; kickoffAt: string; meetLink: string | null } | { ok: false; error: string };

export async function bookKickoff(token: string, slotStart: string): Promise<BookResult> {
  if (!token || !slotStart) return { ok: false, error: 'Missing booking details.' };
  const admin = createAdminClient();

  const { data: portal } = await admin
    .from('client_portal')
    .select('project_id')
    .eq('portal_token', token)
    .maybeSingle();
  if (!portal) return { ok: false, error: 'This project link isn’t active anymore.' };

  const { data: project } = await admin
    .from('projects')
    .select('title, clients ( name, email )')
    .eq('id', portal.project_id)
    .maybeSingle();
  const client = (project?.clients as unknown as { name: string; email: string | null } | null) ?? null;
  const projectTitle = project?.title ?? 'your project';

  // Recompute current availability and confirm the requested slot is still open
  // (defends against a stale slot or a time that filled since the page loaded).
  const now = new Date();
  const timeMax = new Date(now.getTime() + (KICKOFF_CONFIG.horizonDays + 1) * 86_400_000);
  const fb = await freeBusy(admin, { timeMin: now.toISOString(), timeMax: timeMax.toISOString() });
  if (!fb.ok) return { ok: false, error: fb.error };

  const slot = generateSlots(now, fb.busy, KICKOFF_CONFIG).find((s) => s.start === slotStart);
  if (!slot) return { ok: false, error: 'That time was just taken — please pick another.' };

  const result = await createCalendarEvent(admin, {
    title: `Creative Kickoff — ${projectTitle}`,
    description: `Creative kickoff call for ${projectTitle} with Seaside Media.`,
    start: slot.start,
    end: slot.end,
    timeZone: KICKOFF_CONFIG.timeZone,
    attendees: client?.email ? [client.email] : [],
    withMeet: true,
  });
  if (!result.ok) return { ok: false, error: result.error };

  const meetLink = result.meetLink ?? null;
  await admin
    .from('client_portal')
    .update({ kickoff_at: slot.startUtc, kickoff_link: meetLink })
    .eq('project_id', portal.project_id);

  revalidatePath(`/portal/${token}`);
  return { ok: true, kickoffAt: slot.startUtc, meetLink };
}

// ── Brand & asset collection ─────────────────────────────────────────────────

const BUCKET = 'client-assets';

// Resolve a portal token to its project id (or null). Every write below is gated
// through this — the token is the only credential on this anonymous surface.
async function projectForToken(admin: ReturnType<typeof createAdminClient>, token: string): Promise<string | null> {
  if (!token) return null;
  const { data } = await admin.from('client_portal').select('project_id').eq('portal_token', token).maybeSingle();
  return data?.project_id ?? null;
}

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

export type UploadTicket = { ok: true; path: string; token: string } | { ok: false; error: string };

// Mint a short-lived signed upload URL so the browser can send the file DIRECTLY
// to Storage (bypassing the ~4.5MB serverless body limit).
export async function requestAssetUpload(token: string, filename: string): Promise<UploadTicket> {
  const admin = createAdminClient();
  const projectId = await projectForToken(admin, token);
  if (!projectId) return { ok: false, error: 'This project link isn’t active anymore.' };

  const path = `${projectId}/${crypto.randomUUID()}-${safeName(filename || 'file')}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: 'Could not start the upload. Please try again.' };
  return { ok: true, path: data.path, token: data.token };
}

export type AssetResult = { ok: true } | { ok: false; error: string };
export type RecordResult = { ok: true; id: string } | { ok: false; error: string };

// Record an asset row after the browser finished uploading to `path`.
export async function recordUploadedAsset(
  token: string,
  meta: { path: string; filename: string; size: number; contentType: string | null },
): Promise<RecordResult> {
  const admin = createAdminClient();
  const projectId = await projectForToken(admin, token);
  if (!projectId) return { ok: false, error: 'This project link isn’t active anymore.' };
  // The path must live under this project's folder — never trust the client's path.
  if (!meta.path.startsWith(`${projectId}/`)) return { ok: false, error: 'Invalid upload path.' };

  const { data, error } = await admin.from('portal_assets').insert({
    project_id: projectId,
    storage_path: meta.path,
    filename: meta.filename.slice(0, 200),
    size: meta.size,
    content_type: meta.contentType,
  }).select('id').single();
  if (error || !data) return { ok: false, error: 'Could not save the file. Please try again.' };
  revalidatePath(`/portal/${token}`);
  return { ok: true, id: data.id };
}

export async function removeAsset(token: string, assetId: string): Promise<AssetResult> {
  const admin = createAdminClient();
  const projectId = await projectForToken(admin, token);
  if (!projectId) return { ok: false, error: 'This project link isn’t active anymore.' };

  const { data: asset } = await admin
    .from('portal_assets')
    .select('storage_path')
    .eq('id', assetId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (!asset) return { ok: false, error: 'That file is already gone.' };

  await admin.storage.from(BUCKET).remove([asset.storage_path]);
  await admin.from('portal_assets').delete().eq('id', assetId);
  revalidatePath(`/portal/${token}`);
  return { ok: true };
}

// Save the brand / tech / links fields (partial saves as the client types).
export async function saveIntake(
  token: string,
  intake: { brand?: unknown; tech?: unknown; links?: unknown },
): Promise<AssetResult> {
  const admin = createAdminClient();
  const projectId = await projectForToken(admin, token);
  if (!projectId) return { ok: false, error: 'This project link isn’t active anymore.' };

  const { error } = await admin
    .from('client_portal')
    .update({
      brand: (intake.brand ?? null) as Json,
      tech: (intake.tech ?? null) as Json,
      links: (intake.links ?? null) as Json,
    })
    .eq('project_id', projectId);
  if (error) return { ok: false, error: 'Could not save. Please try again.' };
  revalidatePath(`/portal/${token}`);
  return { ok: true };
}

// Mark the intake submitted (owner sees it's ready to review).
export async function submitIntake(token: string): Promise<AssetResult> {
  const admin = createAdminClient();
  const projectId = await projectForToken(admin, token);
  if (!projectId) return { ok: false, error: 'This project link isn’t active anymore.' };
  await admin.from('client_portal').update({ submitted_at: new Date().toISOString() }).eq('project_id', projectId);
  revalidatePath(`/portal/${token}`);
  return { ok: true };
}
