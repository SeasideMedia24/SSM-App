'use server';

// Task server actions, shared by the project detail page and My Tasks.

import { revalidatePath } from 'next/cache';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';
import { taskSchema, newTaskSchema, TASK_STATUS_VALUES } from '@/lib/validation/task';
import type { TaskStatus } from '@/types/database.types';

export type TaskFormState = { error: string | null; ok?: number };

// Create a task from My Tasks and point it at a project, a client, both, or
// neither. Assigned to the current user so it shows up in their list.
const blankToNull = (v: string | undefined) => (v && v !== '' ? v : null);

export async function createTask(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const parsed = newTaskSchema.safeParse({
    title: formData.get('title'),
    project_id: formData.get('project_id') ?? '',
    client_id: formData.get('client_id') ?? '',
    priority: formData.get('priority') || undefined,
    status: formData.get('status') || undefined,
    due_date: formData.get('due_date'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the task and try again.' };
  }
  const d = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectId = blankToNull(d.project_id);
  const { error } = await supabase.from('tasks').insert({
    title: d.title.trim(),
    project_id: projectId,
    client_id: blankToNull(d.client_id),
    priority: d.priority ?? 'medium',
    status: d.status ?? 'not_started',
    due_date: blankToNull(d.due_date),
    assignee_id: user?.id ?? null,
  });
  if (error) return { error: 'Could not create the task. Please try again.' };

  revalidatePath('/my-tasks');
  if (projectId) revalidatePath(`/projects/${projectId}`);
  return { error: null, ok: Date.now() };
}

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
