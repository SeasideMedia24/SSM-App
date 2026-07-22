'use server';

// Message actions, shared by the owner's /messages page and the team's
// /messages page (server actions are plain importable functions — the module
// living under (app) doesn't scope who may call it; RLS does).

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type PostResult = { ok: boolean; error?: string };

const MIGRATION_HINT =
  'Messages need a quick database update — run supabase/migrations/20260722000003_messages.sql in the Supabase SQL Editor, then try again.';

const missingTable = (code?: string) => code === '42P01' || code === '42883';

// Post into a thread. RLS enforces access (owner, participant, or assigned to
// the project) and that sender_id is the caller.
export async function postMessage(threadId: string, body: string): Promise<PostResult> {
  const text = (body ?? '').trim();
  if (!threadId || !text) return { ok: false, error: 'Write a message first.' };
  if (text.length > 4000) return { ok: false, error: 'That message is too long.' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase.from('messages').insert({ thread_id: threadId, sender_id: user.id, body: text });
  if (error) return { ok: false, error: missingTable(error.code) ? MIGRATION_HINT : 'Could not send. Please try again.' };

  revalidatePath('/messages');
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

// Owner: open (or create) the DM with a team member, then jump to it.
export async function openDm(contractorUserId: string): Promise<void> {
  if (!contractorUserId) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Reuse an existing DM with exactly this pair if one exists.
  const { data: mine } = await supabase
    .from('thread_participants')
    .select('thread_id, threads!inner ( kind )')
    .eq('user_id', contractorUserId)
    .eq('threads.kind', 'dm');
  let threadId = null as string | null;
  for (const row of mine ?? []) {
    const { data: other } = await supabase
      .from('thread_participants')
      .select('user_id')
      .eq('thread_id', row.thread_id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (other) { threadId = row.thread_id; break; }
  }

  if (!threadId) {
    const { data: thread, error } = await supabase.from('threads').insert({ kind: 'dm' }).select('id').single();
    if (error || !thread) redirect('/messages?error=dm');
    threadId = thread.id;
    await supabase.from('thread_participants').insert([
      { thread_id: threadId, user_id: user.id },
      { thread_id: threadId, user_id: contractorUserId },
    ]);
  }
  redirect(`/messages?t=${threadId}`);
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
