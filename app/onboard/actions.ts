'use server';

// Handles a public onboarding submission. Runs entirely on the server; the only
// place the service-role admin client is used. Flow:
//   1. spam honeypot check  2. validate  3. create or update the client
//   4. create a draft project (+ template rows)  5. draft contract  6. record the submission.

import { createAdminClient } from '@/lib/supabase/admin';
import { onboardingSchema } from '@/lib/validation/onboarding';
import { PROJECT_TYPES, projectTypeLabel, templateRows } from '@/lib/projects/template';

export type OnboardState = { ok: boolean; error: string | null };

const VALID_TYPES = new Set(PROJECT_TYPES.map((t) => t.value));

export async function submitOnboarding(_prev: OnboardState, formData: FormData): Promise<OnboardState> {
  // 1. Honeypot: real people leave this hidden field empty. Bots fill it.
  if (String(formData.get('website') ?? '').trim() !== '') {
    return { ok: true, error: null }; // pretend success, write nothing
  }

  // 2. Validate.
  const parsed = onboardingSchema.safeParse({
    name: formData.get('name'),
    company: formData.get('company'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    project_type: formData.get('project_type'),
    project_description: formData.get('project_description'),
    budget_range: formData.get('budget_range'),
    desired_timeline: formData.get('desired_timeline'),
    heard_from: formData.get('heard_from'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }
  const d = parsed.data;
  const clean = (v: string | undefined) => (v && v.trim() !== '' ? v.trim() : null);
  const projectType = d.project_type && VALID_TYPES.has(d.project_type as (typeof PROJECT_TYPES)[number]['value'])
    ? d.project_type
    : null;

  const token = String(formData.get('token') ?? '').trim();
  const admin = createAdminClient();

  try {
    // 3. Resolve the client — update the invited one, or create a new lead.
    let clientId: string;
    if (token) {
      const { data: existing } = await admin.from('clients').select('id').eq('onboard_token', token).single();
      if (!existing) return { ok: false, error: 'This invite link is no longer valid.' };
      clientId = existing.id;
      await admin
        .from('clients')
        .update({
          name: d.name.trim(),
          company: clean(d.company),
          email: clean(d.email),
          phone: clean(d.phone),
          onboarded_at: new Date().toISOString(),
          onboard_token: null, // single-use
        })
        .eq('id', clientId);
    } else {
      const { data: created, error } = await admin
        .from('clients')
        .insert({
          name: d.name.trim(),
          company: clean(d.company),
          email: clean(d.email),
          phone: clean(d.phone),
          client_type: 'one_time',
          onboarded_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (error || !created) return { ok: false, error: 'Something went wrong. Please try again.' };
      clientId = created.id;
    }

    // 4. Draft project, pre-filled from the brief, seeded from the type template.
    const briefParts = [
      d.project_description?.trim(),
      d.budget_range ? `Budget: ${d.budget_range}` : null,
      d.desired_timeline ? `Timeline: ${d.desired_timeline}` : null,
      d.heard_from ? `Heard from: ${d.heard_from}` : null,
    ].filter(Boolean);
    const title = `${clean(d.company) ?? d.name.trim()} — ${projectTypeLabel(projectType) ?? 'New project'}`;

    const { data: project } = await admin
      .from('projects')
      .insert({
        client_id: clientId,
        title,
        description: briefParts.join('\n') || null,
        status: 'idea_inquiry',
        priority: 'medium',
        project_type: projectType,
      })
      .select('id')
      .single();

    let projectId: string | null = null;
    if (project) {
      projectId = project.id;
      const rows = templateRows(projectId, projectType ?? undefined);
      await Promise.all([
        admin.from('deliverables').insert(rows.deliverables),
        admin.from('milestones').insert(rows.milestones),
        admin.from('budget_lines').insert(rows.budget_lines),
      ]);
      // 5. Draft contract stub.
      await admin.from('contracts').insert({
        project_id: projectId,
        title: 'Onboarding agreement',
        status: 'draft',
        notes: d.budget_range ? `Discussed budget: ${d.budget_range}` : null,
      });
    }

    // 6. Keep the raw answers for the owner's reference.
    await admin.from('onboarding_submissions').insert({
      name: d.name.trim(),
      company: clean(d.company),
      email: clean(d.email),
      phone: clean(d.phone),
      project_type: projectType,
      project_description: clean(d.project_description),
      budget_range: clean(d.budget_range),
      desired_timeline: clean(d.desired_timeline),
      heard_from: clean(d.heard_from),
      client_id: clientId,
      project_id: projectId,
    });

    return { ok: true, error: null };
  } catch {
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
