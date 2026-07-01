'use server';

// Task server actions, shared by the project detail page and My Tasks.

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { taskSchema, TASK_STATUS_VALUES } from '@/lib/validation/task';
import type { TaskStatus } from '@/types/database.types';

export type TaskFormState = { error: string | null; ok?: number };

// Add a task to a project. New tasks are assigned to the current user so they
// show up in "My Tasks" (single-user for now).
export async function addTask(
  projectId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const parsed = taskSchema.safeParse({
    title: formData.get('title'),
    priority: formData.get('priority') || undefined,
    due_date: formData.get('due_date'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the task and try again.' };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from('tasks').insert({
    project_id: projectId,
    title: parsed.data.title.trim(),
    priority: parsed.data.priority ?? 'medium',
    due_date: parsed.data.due_date && parsed.data.due_date !== '' ? parsed.data.due_date : null,
    assignee_id: user?.id ?? null,
  });
  if (error) return { error: 'Could not add the task. Please try again.' };

  revalidatePath(`/projects/${projectId}`);
  return { error: null, ok: Date.now() };
}

export async function setTaskStatus(taskId: string, projectId: string, status: TaskStatus) {
  if (!TASK_STATUS_VALUES.includes(status)) return;
  const supabase = await createSupabaseServer();
  await supabase.from('tasks').update({ status }).eq('id', taskId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/my-tasks');
}

export async function deleteTask(formData: FormData) {
  const taskId = String(formData.get('id') ?? '').trim();
  const projectId = String(formData.get('project_id') ?? '').trim();
  if (!taskId) return;
  const supabase = await createSupabaseServer();
  await supabase.from('tasks').delete().eq('id', taskId);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/my-tasks');
}
