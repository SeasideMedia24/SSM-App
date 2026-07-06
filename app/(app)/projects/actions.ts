'use server';

// Server actions for projects. All access goes through the RLS-scoped server
// client. Creating a project also seeds the template rows (matched to the chosen
// project type) so a new project starts pre-filled.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { projectSchema, emptyDateToNull } from '@/lib/validation/project';
import { PROJECT_STATUS_VALUES, TASK_PRIORITY_VALUES } from '@/lib/validation/project';
import { templateRows } from '@/lib/projects/template';
import type { ProjectStatus, TaskPriority } from '@/types/database.types';

export type ProjectFormState = { error: string | null };

// When a client reaches this many projects, auto-set them to "recurring"
// (only if they're still the default "one_time" — never overrides a manual choice).
const RECURRING_THRESHOLD = 2;

export async function saveProject(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const id = String(formData.get('id') ?? '').trim();

  const parsed = projectSchema.safeParse({
    title: formData.get('title'),
    client_id: formData.get('client_id'),
    description: formData.get('description'),
    status: formData.get('status') || undefined,
    priority: formData.get('priority') || undefined,
    project_type: formData.get('project_type') || undefined,
    start_date: formData.get('start_date'),
    due_date: formData.get('due_date'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }

  const values = {
    title: parsed.data.title.trim(),
    client_id: parsed.data.client_id,
    description: parsed.data.description?.trim() || null,
    status: parsed.data.status ?? 'idea_inquiry',
    priority: parsed.data.priority ?? 'medium',
    project_type: parsed.data.project_type ?? null,
    start_date: emptyDateToNull(parsed.data.start_date),
    due_date: emptyDateToNull(parsed.data.due_date),
  };

  const supabase = await createSupabaseServer();

  let savedId = id;
  if (id) {
    const { error } = await supabase.from('projects').update(values).eq('id', id);
    if (error) return { error: 'Could not save changes. Please try again.' };
  } else {
    const { data, error } = await supabase.from('projects').insert(values).select('id').single();
    if (error || !data) return { error: 'Could not create the project. Please try again.' };
    savedId = data.id;

    // Seed template rows matched to the chosen type.
    const rows = templateRows(savedId, values.project_type ?? undefined);
    await Promise.all([
      supabase.from('deliverables').insert(rows.deliverables),
      supabase.from('milestones').insert(rows.milestones),
      supabase.from('budget_lines').insert(rows.budget_lines),
    ]);

    // Automation: auto-set the client to "recurring" once they cross the
    // threshold (non-destructive — only when still the default one_time).
    await maybeUpgradeClient(supabase, values.client_id);
  }

  revalidatePath('/projects');
  redirect(`/projects/${savedId}`);
}

type ServerSupabase = Awaited<ReturnType<typeof createSupabaseServer>>;

async function maybeUpgradeClient(supabase: ServerSupabase, clientId: string) {
  const [{ count }, { data: client }] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    supabase.from('clients').select('client_type').eq('id', clientId).single(),
  ]);
  if ((count ?? 0) >= RECURRING_THRESHOLD && client && client.client_type === 'one_time') {
    await supabase.from('clients').update({ client_type: 'recurring' }).eq('id', clientId);
    revalidatePath('/clients');
  }
}

// Called from the kanban when a card is dragged to a new column.
export async function moveProject(id: string, status: ProjectStatus) {
  if (!PROJECT_STATUS_VALUES.includes(status)) return;
  const supabase = await createSupabaseServer();
  await supabase.from('projects').update({ status }).eq('id', id);
  revalidatePath('/projects');
}

// Set a project's priority (from the priority picker on the detail page).
export async function setProjectPriority(id: string, priority: TaskPriority) {
  if (!TASK_PRIORITY_VALUES.includes(priority)) return;
  const supabase = await createSupabaseServer();
  await supabase.from('projects').update({ priority }).eq('id', id);
  revalidatePath('/projects');
  revalidatePath(`/projects/${id}`);
}

// Archive / restore a project. Archiving is reversible, so no destructive confirm.
export async function setProjectArchived(id: string, archived: boolean) {
  const supabase = await createSupabaseServer();
  await supabase.from('projects').update({ status: archived ? 'archived' : 'idea_inquiry' }).eq('id', id);
  revalidatePath('/projects');
  revalidatePath(`/projects/${id}`);
}

// Delete a project (UI confirms first — CLAUDE.md rule #4).
export async function deleteProject(formData: FormData) {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) redirect(`/projects/${id}?error=delete`);
  revalidatePath('/projects');
  redirect('/projects');
}
