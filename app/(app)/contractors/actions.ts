'use server';

// Server actions for contractors/team (Slice A: owner-managed, no logins yet).
// All access goes through the server Supabase client, so RLS applies.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { contractorSchema, parseRate } from '@/lib/validation/contractor';
import { emptyToNull } from '@/lib/validation/client';

export type ContractorFormState = { error: string | null };

// Create (no id) or update (id present) a contractor.
export async function saveContractor(_prev: ContractorFormState, formData: FormData): Promise<ContractorFormState> {
  const id = String(formData.get('id') ?? '').trim();

  const parsed = contractorSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    type: formData.get('type') || undefined,
    role: formData.get('role'),
    rate_unit: formData.get('rate_unit'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }

  const values = {
    name: parsed.data.name.trim(),
    email: emptyToNull(parsed.data.email),
    phone: emptyToNull(parsed.data.phone),
    type: parsed.data.type ?? 'external',
    role: emptyToNull(parsed.data.role),
    rate_full: parseRate(formData.get('rate_full')),
    rate_half: parseRate(formData.get('rate_half')),
    rate_hourly: parseRate(formData.get('rate_hourly')),
    notes: emptyToNull(parsed.data.notes),
  };

  const supabase = await createSupabaseServer();

  let savedId = id;
  if (id) {
    const { error } = await supabase.from('contractors').update(values).eq('id', id);
    if (error) return { error: 'Could not save changes. Please try again.' };
  } else {
    const { data, error } = await supabase.from('contractors').insert(values).select('id').single();
    if (error || !data) return { error: 'Could not create the contractor. Please try again.' };
    savedId = data.id;
  }

  revalidatePath('/contractors');
  redirect(`/contractors/${savedId}`);
}

// Delete a contractor (their assignments cascade). UI confirms first (CLAUDE.md #4).
export async function deleteContractor(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await createSupabaseServer();
  const { error } = await supabase.from('contractors').delete().eq('id', id);
  if (error) redirect(`/contractors/${id}?error=delete`);

  revalidatePath('/contractors');
  redirect('/contractors');
}

// Generate (or refresh) a private self-onboarding link for a contractor. The
// owner shares the resulting /contractor-onboard/<token> link; the contractor
// fills in their own contact details and rates (no login).
export async function generateContractorOnboardToken(formData: FormData) {
  const contractorId = String(formData.get('id') ?? '').trim();
  if (!contractorId) return;

  const supabase = await createSupabaseServer();
  await supabase.from('contractors').update({ onboard_token: crypto.randomUUID() }).eq('id', contractorId);
  revalidatePath(`/contractors/${contractorId}`);
}

// Assign a contractor to a project with an optional rate (falls back to the
// contractor's default rate). Idempotent on (project, contractor).
export async function assignProject(formData: FormData) {
  const contractorId = String(formData.get('contractor_id') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim();
  if (!contractorId || !projectId) return;

  const supabase = await createSupabaseServer();
  await supabase.from('project_contractors').upsert(
    {
      contractor_id: contractorId,
      project_id: projectId,
      role: emptyToNull(String(formData.get('role') ?? '')),
      rate: parseRate(formData.get('rate')),
      rate_unit: emptyToNull(String(formData.get('rate_unit') ?? '')),
    },
    { onConflict: 'project_id,contractor_id' },
  );

  revalidatePath(`/contractors/${contractorId}`);
  revalidatePath(`/projects/${projectId}`);
}

// Remove a single assignment by its id.
export async function unassignProject(formData: FormData) {
  const assignmentId = String(formData.get('assignment_id') ?? '').trim();
  const contractorId = String(formData.get('contractor_id') ?? '').trim();
  if (!assignmentId) return;

  const supabase = await createSupabaseServer();
  await supabase.from('project_contractors').delete().eq('id', assignmentId);

  if (contractorId) revalidatePath(`/contractors/${contractorId}`);
}

// ── Clearance ────────────────────────────────────────────────────────────────
// A person's default level lives on contractors.clearance; each assignment can
// override it (project_contractors.clearance, null = use the default). Owner
// only — verified here AND enforced by RLS.

export type ClearanceResult = { ok: boolean; message?: string };

const MIGRATION_HINT_CLEARANCE =
  'Clearance needs a quick database update — run supabase/migrations/20260722000002_clearance.sql in the Supabase SQL Editor, then try again.';

export async function setContractorClearance(contractorId: string, level: number): Promise<ClearanceResult> {
  if (!contractorId || ![1, 2, 3].includes(level)) return { ok: false, message: 'Pick a level 1–3.' };
  const supabase = await createSupabaseServer();
  const { getAppRole } = await import('@/lib/auth/role');
  if ((await getAppRole(supabase)) !== 'owner') return { ok: false, message: 'Owner only.' };

  const { error } = await supabase.from('contractors').update({ clearance: level }).eq('id', contractorId);
  if (error) return { ok: false, message: error.code === '42703' ? MIGRATION_HINT_CLEARANCE : 'Could not save. Please try again.' };
  revalidatePath(`/contractors/${contractorId}`);
  return { ok: true };
}

export async function setAssignmentClearance(
  assignmentId: string,
  contractorId: string,
  level: number | null, // null = clear the override (use the person's default)
): Promise<ClearanceResult> {
  if (!assignmentId) return { ok: false, message: 'Missing assignment.' };
  if (level !== null && ![1, 2, 3].includes(level)) return { ok: false, message: 'Pick a level 1–3.' };
  const supabase = await createSupabaseServer();
  const { getAppRole } = await import('@/lib/auth/role');
  if ((await getAppRole(supabase)) !== 'owner') return { ok: false, message: 'Owner only.' };

  const { error } = await supabase.from('project_contractors').update({ clearance: level }).eq('id', assignmentId);
  if (error) return { ok: false, message: error.code === '42703' ? MIGRATION_HINT_CLEARANCE : 'Could not save. Please try again.' };
  revalidatePath(`/contractors/${contractorId}`);
  return { ok: true };
}

// ── Slice B1: invite a contractor to log in ──────────────────────────────────
// Uses the ADMIN client (service role) because creating auth users is an admin
// operation — so we explicitly verify the caller is the owner first.
//
// Delivery: we mint the invite link ourselves (generateLink) and email it via
// Resend — Supabase's built-in mailer is rate-limited and silently unreliable
// in production, which is exactly why invites "never arrived". The link is
// ALSO returned so the owner can copy it and send it any way they like (text,
// Slack, in person) even when email is down. The signup trigger links the new
// auth user to this contractor row and stamps their role as 'contractor'.

export type InviteLoginResult = { ok: boolean; message: string; inviteUrl?: string };

export async function inviteContractorLogin(contractorId: string): Promise<InviteLoginResult> {
  if (typeof contractorId !== 'string' || contractorId.length === 0) {
    return { ok: false, message: 'Missing contractor.' };
  }

  const supabase = await createSupabaseServer();
  const { getAppRole } = await import('@/lib/auth/role');
  if ((await getAppRole(supabase)) !== 'owner') {
    return { ok: false, message: 'Only the owner can send login invites.' };
  }

  // RLS-scoped read; the owner sees every contractor.
  const { data: contractor } = await supabase
    .from('contractors')
    .select('id, name, email, user_id')
    .eq('id', contractorId)
    .maybeSingle();
  if (!contractor) return { ok: false, message: 'Contractor not found.' };
  if (contractor.user_id) return { ok: false, message: 'They already have a login.' };
  if (!contractor.email) {
    return { ok: false, message: 'Add an email address to this contractor first (Edit).' };
  }

  const { headers } = await import('next/headers');
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const origin = `${proto}://${host}`;

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const admin = createAdminClient();
  const { data: linkData, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: contractor.email,
    options: {
      data: { full_name: contractor.name, contractor_id: contractor.id },
      redirectTo: `${origin}/welcome`,
    },
  });
  const inviteUrl = linkData?.properties?.action_link;
  if (error || !inviteUrl) {
    const already = /already.*(registered|exists)/i.test(error?.message ?? '');
    return {
      ok: false,
      message: already
        ? 'That email already has an account. If it’s theirs, they can just log in.'
        : 'Could not create the invite. Please try again.',
    };
  }

  // Email it through Resend (branded, reliable). If email isn't set up or the
  // send fails, the invite STILL succeeded — hand the owner the copyable link.
  const { sendTeamInviteEmail } = await import('@/lib/email/send');
  const sent = await sendTeamInviteEmail({
    origin,
    to: contractor.email,
    name: contractor.name,
    inviteUrl,
  });

  revalidatePath(`/contractors/${contractorId}`);
  return sent.ok
    ? { ok: true, message: `Invite emailed to ${contractor.email}. You can also copy the link below and send it yourself.`, inviteUrl }
    : { ok: true, message: `Invite created, but the email didn’t send (${sent.reason}). Copy the link below and send it to them directly.`, inviteUrl };
}
