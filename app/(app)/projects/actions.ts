'use server';

// Server actions for projects. All access goes through the RLS-scoped server
// client. Creating a project also seeds the template rows (deliverables,
// milestones, budget lines) so a new project starts pre-filled.

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { projectSchema, parseTags, emptyDateToNull } from '@/lib/validation/project';
import { templateRows } from '@/lib/projects/template';
import type { ProjectStatus } from '@/types/database.types';
import { PROJECT_STATUS_VALUES } from '@/lib/validation/project';

export type ProjectFormState = { error: string | null };

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
    para_category: formData.get('para_category') || undefined,
    start_date: formData.get('start_date'),
    due_date: formData.get('due_date'),
    tags: formData.get('tags'),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' };
  }

  const values = {
    title: parsed.data.title.trim(),
    client_id: parsed.data.client_id,
    description: parsed.data.description?.trim() || null,
    status: parsed.data.status ?? 'idea_inquiry',
    para_category: parsed.data.para_category ?? 'project',
    tags: parseTags(parsed.data.tags),
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

    // Seed the template rows for the new project (best-effort).
    const rows = templateRows(savedId);
    await Promise.all([
      supabase.from('deliverables').insert(rows.deliverables),
      supabase.from('milestones').insert(rows.milestones),
      supabase.from('budget_lines').insert(rows.budget_lines),
    ]);
  }

  revalidatePath('/projects');
  redirect(`/projects/${savedId}`);
}

// Called from the kanban when a card is dragged to a new column.
export async function moveProject(id: string, status: ProjectStatus) {
  if (!PROJECT_STATUS_VALUES.includes(status)) return;
  const supabase = await createSupabaseServer();
  await supabase.from('projects').update({ status }).eq('id', id);
  revalidatePath('/projects');
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
