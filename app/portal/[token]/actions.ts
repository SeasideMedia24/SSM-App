'use server';

// Booking the creative kickoff from the client portal. Anonymous surface, so
// this runs through the admin client and is gated by the portal token. It uses
// the OWNER's Google connection (via the admin client) to read availability and
// book the event. Re-checks availability at book time to prevent double-booking.

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
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
