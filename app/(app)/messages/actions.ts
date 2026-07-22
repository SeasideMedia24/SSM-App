'use server';

// Message actions, shared by the owner's /messages page and the team's
// /messages page (server actions are plain importable functions — the module
// living under (app) doesn't scope who may call it; RLS does).

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { notifyThreadByEmail } from '@/lib/messages/notify';

export type PostResult = { ok: boolean; error?: string };
export type MessageRef = { type: 'project' | 'task' | 'deliverable'; id: string };

const MIGRATION_HINT =
  'Messages need a quick database update — run supabase/migrations/20260722000003_messages.sql in the Supabase SQL Editor, then try again.';

const missingTable = (code?: string) => code === '42P01' || code === '42883';

// Post into a thread. RLS enforces access (owner, participant, or assigned to
// the project) and that sender_id is the caller. An optional ref attaches a
// project/task/deliverable chip. Fires a best-effort email to recipients who
// haven't read the thread lately (never blocks the send).
export async function postMessage(threadId: string, body: string, ref?: MessageRef | null): Promise<PostResult> {
  const text = (body ?? '').trim();
  if (!threadId || !text) return { ok: false, error: 'Write a message first.' };
  if (text.length > 4000) return { ok: false, error: 'That message is too long.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase.from('messages').insert({
    thread_id: threadId,
    sender_id: user.id,
    body: text,
    ref_type: ref?.type ?? null,
    ref_id: ref?.id ?? null,
  });
  if (error) return { ok: false, error: missingTable(error.code) ? MIGRATION_HINT : 'Could not send. Please try again.' };

  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host') ?? ''}`;
  await notifyThreadByEmail(threadId, user.id, text, origin).catch(() => null);

  revalidatePath('/messages');
  revalidatePath('/my-messages');
  return { ok: true };
}

// Stamp "I've seen this thread up to now" — upserts the caller's participant row.
export async function markThreadRead(threadId: string): Promise<void> {
  if (!threadId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('thread_participants')
    .upsert({ thread_id: threadId, user_id: user.id, last_read_at: new Date().toISOString() }, { onConflict: 'thread_id,user_id' });
  revalidatePath('/messages');
}

// Open (or create) the 1:1 DM with another user, then jump to it. Works for the
// owner AND team members — the start_dm function checks shares_project and
// reuses/creates the thread + participants under SECURITY DEFINER, so no fragile
// insert policies are needed. basePath routes to the caller's messages surface.
export async function openDm(otherUserId: string, basePath: '/messages' | '/my-messages' = '/messages'): Promise<void> {
  if (!otherUserId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: threadId, error } = await supabase.rpc('start_dm', { other: otherUserId });
  if (error || !threadId) redirect(`${basePath}?error=dm`);
  redirect(`${basePath}?t=${threadId}`);
}

// Ensure a project's thread exists (called when someone is assigned).
export async function ensureProjectThread(projectId: string): Promise<void> {
  if (!projectId) return;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('threads')
    .select('id')
    .eq('kind', 'project')
    .eq('project_id', projectId)
    .maybeSingle();
  if (!existing) {
    await supabase.from('threads').insert({ kind: 'project', project_id: projectId });
  }
}
