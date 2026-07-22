// Shared message queries — used by BOTH the owner's /messages page and the
// team's /messages page. RLS does the real scoping (each viewer only ever sees
// threads can_access_thread allows), so these stay thin.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type DB = SupabaseClient<Database>;

export type ThreadSummary = {
  id: string;
  kind: 'project' | 'dm';
  title: string;          // project title, or the other person's name
  lastBody: string | null;
  lastAt: string | null;
  unread: boolean;
};

export type MessageRefChip = { kind: 'project' | 'task' | 'deliverable'; label: string };

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
  senderName: string;
  ref?: MessageRefChip;
};

// A short, viewer-facing list of things a message can reference. RLS-scoped, so
// each viewer only sees items they can access.
export type AttachableItems = {
  projects: { id: string; title: string }[];
  tasks: { id: string; title: string }[];
  deliverables: { id: string; title: string }[];
};

export async function attachableItems(supabase: DB): Promise<AttachableItems> {
  const [{ data: projects }, { data: tasks }, { data: deliverables }] = await Promise.all([
    supabase.from('projects').select('id, title').neq('status', 'archived').order('created_at', { ascending: false }).limit(60),
    supabase.from('tasks').select('id, title').neq('status', 'done').order('created_at', { ascending: false }).limit(100),
    supabase.from('deliverables').select('id, title').neq('status', 'done').order('created_at', { ascending: false }).limit(100),
  ]);
  return { projects: projects ?? [], tasks: tasks ?? [], deliverables: deliverables ?? [] };
}

// Every thread the viewer can see, newest activity first, with an unread flag.
export async function listThreads(supabase: DB, viewerId: string): Promise<ThreadSummary[]> {
  const { data: threads } = await supabase
    .from('threads')
    .select('id, kind, project_id, created_at, projects ( title ), thread_participants ( user_id, last_read_at, profiles ( full_name ) )')
    .order('created_at', { ascending: false })
    .limit(100);
  if (!threads || threads.length === 0) return [];

  // Latest message per thread (one query; threads are few at this scale).
  const ids = threads.map((t) => t.id);
  const { data: lasts } = await supabase
    .from('messages')
    .select('thread_id, body, created_at, sender_id')
    .in('thread_id', ids)
    .order('created_at', { ascending: false })
    .limit(400);
  const lastByThread = new Map<string, { body: string; created_at: string; sender_id: string }>();
  for (const m of lasts ?? []) if (!lastByThread.has(m.thread_id)) lastByThread.set(m.thread_id, m);

  const rows = threads.map((t) => {
    const parts = (t.thread_participants ?? []) as { user_id: string; last_read_at: string | null; profiles: { full_name: string | null } | { full_name: string | null }[] | null }[];
    const mine = parts.find((p) => p.user_id === viewerId);
    const others = parts.filter((p) => p.user_id !== viewerId);
    const otherName = others
      .map((p) => (Array.isArray(p.profiles) ? p.profiles[0]?.full_name : p.profiles?.full_name))
      .filter(Boolean)[0] as string | undefined;
    const project = t.projects as unknown as { title: string } | { title: string }[] | null;
    const projectTitle = Array.isArray(project) ? project[0]?.title : project?.title;
    const last = lastByThread.get(t.id) ?? null;
    const unread = !!last && last.sender_id !== viewerId && (!mine?.last_read_at || last.created_at > mine.last_read_at);
    return {
      id: t.id,
      kind: t.kind as 'project' | 'dm',
      title: t.kind === 'project' ? (projectTitle ?? 'Project') : (otherName ?? 'Direct message'),
      lastBody: last?.body ?? null,
      lastAt: last?.created_at ?? t.created_at,
      unread,
    };
  });
  // Newest activity first.
  return rows.sort((a, b) => ((a.lastAt ?? '') < (b.lastAt ?? '') ? 1 : -1));
}

export async function getThreadMessages(supabase: DB, threadId: string, viewerId: string): Promise<ThreadMessage[]> {
  const { data } = await supabase
    .from('messages')
    .select('id, body, created_at, sender_id, ref_type, ref_id, profiles ( full_name )')
    .eq('thread_id', threadId)
    .order('created_at')
    .limit(500);
  const rows = data ?? [];

  // Resolve any referenced items to a title (batched per table).
  const idsByType: Record<string, string[]> = { project: [], task: [], deliverable: [] };
  for (const m of rows) if (m.ref_type && m.ref_id && idsByType[m.ref_type]) idsByType[m.ref_type].push(m.ref_id);
  const titles = new Map<string, string>(); // `${type}:${id}` → title
  await Promise.all(
    (['project', 'task', 'deliverable'] as const).map(async (type) => {
      const ids = [...new Set(idsByType[type])];
      if (ids.length === 0) return;
      const table = type === 'project' ? 'projects' : type === 'task' ? 'tasks' : 'deliverables';
      const { data: items } = await supabase.from(table).select('id, title').in('id', ids);
      for (const it of items ?? []) titles.set(`${type}:${it.id}`, it.title);
    }),
  );

  return rows.map((m) => {
    const prof = m.profiles as unknown as { full_name: string | null } | { full_name: string | null }[] | null;
    const name = Array.isArray(prof) ? prof[0]?.full_name : prof?.full_name;
    const kind = m.ref_type as MessageRefChip['kind'] | null;
    const label = kind && m.ref_id ? titles.get(`${kind}:${m.ref_id}`) : undefined;
    return {
      id: m.id,
      body: m.body,
      createdAt: m.created_at,
      mine: m.sender_id === viewerId,
      senderName: name ?? 'Someone',
      ref: kind && label ? { kind, label } : undefined,
    };
  });
}

export type MessageableUser = { userId: string; name: string };

// Who the viewer can start a DM with (owner → team; team → owner + teammates).
export async function messageableUsers(supabase: DB): Promise<MessageableUser[]> {
  const { data, error } = await supabase.rpc('messageable_users');
  if (error || !data) return [];
  const seen = new Set<string>();
  const out: MessageableUser[] = [];
  for (const r of data) {
    if (r.user_id && !seen.has(r.user_id)) { seen.add(r.user_id); out.push({ userId: r.user_id, name: r.name ?? 'Teammate' }); }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function unreadCount(supabase: DB): Promise<number> {
  const { data, error } = await supabase.rpc('unread_message_count');
  if (error) return 0; // pre-migration → no badge
  return data ?? 0;
}
