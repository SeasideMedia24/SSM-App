'use server';

// Server actions for saved PaePae conversations. The chat client autosaves the
// full rich transcript (jsonb) after each turn; these are plain RLS-scoped
// CRUD — no Claude calls here (those stay in app/api/paepae/*).

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database.types';

export type ConversationSummary = { id: string; title: string; updated_at: string };

// Upsert one conversation. Pass id=null on the first save; returns the row id
// to use for every save after that.
export async function saveConversation(
  id: string | null,
  title: string,
  messages: Json,
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const cleanTitle = title.trim().slice(0, 80) || 'New chat';

  if (id) {
    const { error } = await supabase
      .from('paepae_conversations')
      .update({ title: cleanTitle, messages, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: saveError(error.code) };
    return { id };
  }

  const { data, error } = await supabase
    .from('paepae_conversations')
    .insert({ title: cleanTitle, messages })
    .select('id')
    .single();
  if (error || !data) return { error: saveError(error?.code) };
  return { id: data.id };
}

// 42P01 = table missing (migration not applied) — surface the friendly hint.
function saveError(code: string | undefined): string {
  return code === '42P01'
    ? 'Saved chats need a quick database update — run supabase/migrations/20260718000002_paepae_conversations.sql in the Supabase SQL Editor.'
    : 'Could not save this conversation.';
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('paepae_conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getConversation(id: string): Promise<{ id: string; title: string; messages: Json } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('paepae_conversations')
    .select('id, title, messages')
    .eq('id', id)
    .maybeSingle();
  return data;
}

// Delete a saved conversation. The UI confirms first (CLAUDE.md #4).
export async function deleteConversation(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('paepae_conversations').delete().eq('id', id);
}
