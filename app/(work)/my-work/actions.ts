'use server';

// Server actions for a contractor's My Work page. Every write goes through the
// RLS-scoped client: the "tasks: contractor update own" policy limits WHICH
// rows they can touch, and the contractor_task_update_guard trigger limits
// WHICH COLUMNS (status + worker_note only). These actions are just the
// polite, validated way in.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { TaskStatus } from '@/types/database.types';

const TASK_STATUS_VALUES: TaskStatus[] = ['not_started', 'in_progress', 'done'];

export async function setMyTaskStatus(taskId: string, status: TaskStatus) {
  if (typeof taskId !== 'string' || !TASK_STATUS_VALUES.includes(status)) return;
  const supabase = await createClient();
  await supabase.from('tasks').update({ status }).eq('id', taskId);
  revalidatePath('/my-work');
}

export type NoteState = { ok: boolean; error: string | null };

export async function saveMyTaskNote(_prev: NoteState, formData: FormData): Promise<NoteState> {
  const taskId = String(formData.get('task_id') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim().slice(0, 2000);
  if (!taskId) return { ok: false, error: 'Missing task.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('tasks')
    .update({ worker_note: note === '' ? null : note })
    .eq('id', taskId);
  if (error) return { ok: false, error: 'Could not save the note. Please try again.' };

  revalidatePath('/my-work');
  return { ok: true, error: null };
}
