'use server';

// Server actions for the Brainstorming canvas. Boards + items are owner-only
// (RLS: authenticated), so these use the normal server client. Media uploads use
// signed upload URLs (browser PUTs directly) + the admin client to mint them,
// mirroring the client-portal pattern.

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database.types';

export type BoardKind = 'storyboard' | 'shotlist' | 'brainstorm' | 'storyline';
export type ItemType = 'note' | 'image' | 'file' | 'link' | 'embed';
const BUCKET = 'brainstorm-media';

const KINDS: BoardKind[] = ['storyboard', 'shotlist', 'brainstorm', 'storyline'];
const TYPES: ItemType[] = ['note', 'image', 'file', 'link', 'embed'];

export async function createBoard(kind: BoardKind, title?: string): Promise<{ id: string }> {
  if (!KINDS.includes(kind)) throw new Error('Unknown board kind.');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('boards')
    .insert({ kind, title: (title ?? '').trim() || 'Untitled' })
    .select('id')
    .single();
  if (error || !data) throw new Error('Could not create the board.');
  revalidatePath('/brainstorm');
  return { id: data.id };
}

export async function renameBoard(id: string, title: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('boards').update({ title: title.trim() || 'Untitled', updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/brainstorm');
  revalidatePath(`/brainstorm/${id}`);
}

export async function deleteBoard(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('boards').delete().eq('id', id); // items cascade
  revalidatePath('/brainstorm');
}

export async function addItem(
  boardId: string,
  type: ItemType,
  x: number,
  y: number,
  content: Json,
  size?: { w?: number; h?: number },
): Promise<{ id: string }> {
  if (!TYPES.includes(type)) throw new Error('Unknown item type.');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('board_items')
    .insert({ board_id: boardId, type, x, y, content, ...(size?.w ? { w: size.w } : {}), ...(size?.h ? { h: size.h } : {}) })
    .select('id')
    .single();
  if (error || !data) throw new Error('Could not add the item.');
  return { id: data.id };
}

export type ItemPatch = {
  x?: number; y?: number; w?: number; h?: number; z?: number; rotation?: number; content?: Json;
};

export async function updateItem(id: string, patch: ItemPatch): Promise<void> {
  const supabase = await createClient();
  await supabase.from('board_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
}

export async function deleteItem(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from('board_items').delete().eq('id', id);
}

// ── Media uploads (signed URL → browser PUT → record) ────────────────────────

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

export type UploadTicket = { ok: true; path: string; token: string } | { ok: false; error: string };

export async function requestMediaUpload(boardId: string, filename: string): Promise<UploadTicket> {
  // Confirm the board exists and the caller is authenticated (RLS on the read).
  const supabase = await createClient();
  const { data: board } = await supabase.from('boards').select('id').eq('id', boardId).maybeSingle();
  if (!board) return { ok: false, error: 'That board no longer exists.' };

  const admin = createAdminClient();
  const path = `${boardId}/${crypto.randomUUID()}-${safeName(filename || 'file')}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: 'Could not start the upload.' };
  return { ok: true, path: data.path, token: data.token };
}

// Signed download URL for a stored asset (private bucket).
export async function mediaUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
